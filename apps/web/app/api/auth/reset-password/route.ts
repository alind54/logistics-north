import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleAuthError, badRequest } from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { generateResetToken, resetPasswordWithToken } from '@/server/auth/password-reset';
import { prisma } from '@/server/db';

const generateTokenSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

// POST /api/auth/reset-password - Generate token (admin) or reset password (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // If 'token' field is present, it's a password reset submission
    if (body.token) {
      const parsed = resetPasswordSchema.safeParse(body);
      if (!parsed.success) {
        return badRequest('Invalid input');
      }

      const result = await resetPasswordWithToken(parsed.data.token, parsed.data.newPassword);
      if (!result.success) {
        return badRequest(result.error ?? 'Reset failed');
      }

      return apiSuccess({ message: 'Password reset successfully' });
    }

    // Otherwise, it's a token generation request (admin only)
    await requirePermission('user:manage');

    const parsed = generateTokenSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest('Valid email is required');
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (!user) {
      return badRequest('User not found');
    }

    const token = await generateResetToken(user.id);

    return apiSuccess({ token, expiresIn: '24 hours' });
  } catch (error) {
    return handleAuthError(error);
  }
}
