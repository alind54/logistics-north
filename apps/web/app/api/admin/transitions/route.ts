import { NextRequest } from 'next/server';
import {
  apiSuccess,
  parseBody,
  handleAuthError,
  badRequest,
} from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { listTransitions, createTransition } from '@/server/admin/transitions';
import { transitionCreateSchema, type TransitionCreateInput } from '@request-tracker/shared';

// GET /api/admin/transitions - List all transitions
export async function GET(_request: NextRequest) {
  try {
    await requirePermission('transition:manage');

    const transitions = await listTransitions();
    return apiSuccess({ transitions });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/admin/transitions - Create a new transition
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('transition:manage');

    const { data, error } = await parseBody(request, transitionCreateSchema);
    if (error) return error;

    const transition = await createTransition(data as TransitionCreateInput, user.id);
    return apiSuccess(transition, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('must be different')) {
        return badRequest(error.message);
      }
      if (error.message.includes('Unique constraint')) {
        return badRequest('This transition already exists');
      }
    }
    return handleAuthError(error);
  }
}
