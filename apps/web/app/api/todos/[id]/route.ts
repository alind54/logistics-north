import { NextRequest } from 'next/server';
import { apiSuccess, parseBody, handleAuthError, notFound } from '@/server/api-utils';
import { requireAuth } from '@/server/auth/session';
import { updateTodo, deleteTodo } from '@/server/todos';
import { todoUpdateSchema } from '@request-tracker/shared';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/todos/:id - Update a todo
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const { data, error } = await parseBody(request, todoUpdateSchema);
    if (error) return error;

    const todo = await updateTodo(id, user.id, data);
    return apiSuccess(todo);
  } catch (error) {
    if (error instanceof Error && error.message === 'Todo not found') {
      return notFound('Todo');
    }
    return handleAuthError(error);
  }
}

// DELETE /api/todos/:id - Delete a todo
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    await deleteTodo(id, user.id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Todo not found') {
      return notFound('Todo');
    }
    return handleAuthError(error);
  }
}
