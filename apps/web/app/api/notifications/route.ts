import { NextRequest } from 'next/server';
import { apiSuccess, handleAuthError } from '@/server/api-utils';
import { requireAuth } from '@/server/auth/session';
import {
  getNotificationsForUser,
  markAllNotificationsRead,
} from '@/server/notifications';

// GET /api/notifications - Get notifications for current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    const result = await getNotificationsForUser(user.id, { unreadOnly });
    return apiSuccess(result);
  } catch (error) {
    return handleAuthError(error);
  }
}

// PATCH /api/notifications - Mark all notifications as read
export async function PATCH(_request: NextRequest) {
  try {
    const user = await requireAuth();
    const count = await markAllNotificationsRead(user.id);
    return apiSuccess({ marked: count });
  } catch (error) {
    return handleAuthError(error);
  }
}
