import { prisma } from '../db';
import { createAuditEvent } from '../audit';
import { hashPassword } from '../auth/password';
import { AuditEventType, type UserDTO, type UserRole } from '@request-tracker/shared';

export async function listUsers(): Promise<UserDTO[]> {
  const users = await prisma.user.findMany({
    orderBy: { email: 'asc' },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
    },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role as UserRole,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  }));
}

export async function createUser(
  email: string,
  password: string,
  role: UserRole,
  actorUserId: string
): Promise<UserDTO> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('A user with this email already exists');
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
    },
  });

  await createAuditEvent(AuditEventType.USER_CREATED, actorUserId, null, {
    userId: user.id,
    email: user.email,
    role,
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
  actorUserId: string
): Promise<UserDTO | null> {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return null;

  // Prevent self-role-change
  if (userId === actorUserId) {
    throw new Error('Cannot change your own role');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
    },
  });

  await createAuditEvent(AuditEventType.USER_UPDATED, actorUserId, null, {
    userId: user.id,
    email: user.email,
    previousRole: existing.role,
    newRole: role,
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}
