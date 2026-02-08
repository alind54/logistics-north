import { NextRequest } from 'next/server';
import { apiSuccess, parseBody, handleAuthError } from '@/server/api-utils';
import { requireAuth } from '@/server/auth/session';
import { listTodos, createTodo } from '@/server/todos';
import { todoCreateSchema } from '@request-tracker/shared';

// GET /api/todos - List current user's todos
export async function GET() {
  try {
    const user = await requireAuth();
    const todos = await listTodos(user.id);
    return apiSuccess(todos);
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/todos - Create a new todo
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { data, error } = await parseBody(request, todoCreateSchema);
    if (error) return error;

    const todo = await createTodo(user.id, data);
    return apiSuccess(todo, 201);
  } catch (error) {
    return handleAuthError(error);
  }
}
