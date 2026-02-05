import { NextRequest } from 'next/server';
import { apiSuccess, handleAuthError, notFound } from '@/server/api-utils';
import { requireAuth } from '@/server/auth/session';
import { markNotificationRead } from '@/server/notifications';

// PATCH /api/notifications/:id - Mark single notification as read
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const success = await markNotificationRead(id, user.id);
    if (!success) return notFound('Notification');

    return apiSuccess({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
