import { apiSuccess, handleAuthError } from '@/server/api-utils';
import { requireAuth } from '@/server/auth/session';
import { clearCompletedTodos } from '@/server/todos';

// POST /api/todos/clear-completed - Clear all completed todos for user
export async function POST() {
  try {
    const user = await requireAuth();
    const count = await clearCompletedTodos(user.id);
    return apiSuccess({ cleared: count });
  } catch (error) {
    return handleAuthError(error);
  }
}
