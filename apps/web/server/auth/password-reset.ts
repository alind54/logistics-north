import * as crypto from 'crypto';
import { prisma } from '../db';
import { hashPassword } from './password';
import { logger } from '@/lib/logger';

const RESET_TOKEN_EXPIRY_HOURS = 24;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function generateResetToken(userId: string): Promise<string> {
  // Invalidate any existing tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  logger.info('Password reset token generated', { userId });
  return token;
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const tokenHash = hashToken(token);

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!resetToken) {
    return { success: false, error: 'Invalid or expired reset token' };
  }

  if (resetToken.usedAt) {
    return { success: false, error: 'This reset token has already been used' };
  }

  if (resetToken.expiresAt < new Date()) {
    return { success: false, error: 'Reset token has expired' };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  logger.info('Password reset completed', { userId: resetToken.userId });
  return { success: true };
}
