import { NextRequest } from 'next/server';
import {
  apiSuccess,
  parseBody,
  handleAuthError,
  notFound,
} from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { updateTransition } from '@/server/admin/transitions';
import { transitionUpdateSchema, type TransitionUpdateInput } from '@request-tracker/shared';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/transitions/:id - Update a transition
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('transition:manage');
    const { id } = await params;

    const { data, error } = await parseBody(request, transitionUpdateSchema);
    if (error) return error;

    const transition = await updateTransition(id, data as TransitionUpdateInput, user.id);
    if (!transition) return notFound('Transition');

    return apiSuccess(transition);
  } catch (error) {
    return handleAuthError(error);
  }
}
