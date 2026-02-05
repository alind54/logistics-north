import { UserRole, ROLE_HIERARCHY } from '@request-tracker/shared';
import { requireAuth } from './session';

export type Permission =
  | 'request:create'
  | 'request:read'
  | 'request:update'
  | 'request:delete'
  | 'request:move-stage'
  | 'attachment:upload'
  | 'attachment:download'
  | 'attachment:delete'
  | 'stage:manage'
  | 'transition:manage'
  | 'user:manage'
  | 'tag:manage'
  | 'audit:read';

// Permission matrix: which roles can perform which actions
const PERMISSIONS: Record<Permission, UserRole[]> = {
  'request:create': ['ADMIN', 'MANAGER', 'OPERATOR'],
  'request:read': ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  'request:update': ['ADMIN', 'MANAGER', 'OPERATOR'],
  'request:delete': ['ADMIN', 'MANAGER'],
  'request:move-stage': ['ADMIN', 'MANAGER', 'OPERATOR'],
  'attachment:upload': ['ADMIN', 'MANAGER', 'OPERATOR'],
  'attachment:download': ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  'attachment:delete': ['ADMIN', 'MANAGER'],
  'stage:manage': ['ADMIN'],
  'transition:manage': ['ADMIN'],
  'user:manage': ['ADMIN'],
  'tag:manage': ['ADMIN', 'MANAGER'],
  'audit:read': ['ADMIN', 'MANAGER'],
};

export function hasRole(userRole: string, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 999;
  return userLevel >= requiredLevel;
}

export function hasPermission(userRole: string, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.includes(userRole as UserRole);
}

export async function requirePermission(permission: Permission): Promise<{
  id: string;
  email: string;
  role: string;
}> {
  const user = await requireAuth();

  if (!hasPermission(user.role, permission)) {
    throw new Error('Forbidden');
  }

  return user;
}

export async function requireRole(requiredRole: UserRole): Promise<{
  id: string;
  email: string;
  role: string;
}> {
  const user = await requireAuth();

  if (!hasRole(user.role, requiredRole)) {
    throw new Error('Forbidden');
  }

  return user;
}

// Helper to check if user can access a specific request
// Viewers can only see requests, operators can update any request,
// but this can be extended for owner-based restrictions
export function canAccessRequest(
  userRole: string,
  _userId: string,
  _requestOwnerId: string | null
): boolean {
  // For MVP, all authenticated users with read permission can access any request
  return hasPermission(userRole, 'request:read');
}
