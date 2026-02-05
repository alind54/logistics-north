import { prisma } from '@/server/db';
import { requireAuth } from '@/server/auth/session';
import { apiSuccess, handleAuthError, notFound } from '@/server/api-utils';

export async function GET() {
  try {
    const sessionUser = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return notFound('User');
    }

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
