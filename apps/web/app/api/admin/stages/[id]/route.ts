import { NextRequest } from 'next/server';
import {
  apiSuccess,
  parseBody,
  handleAuthError,
  notFound,
} from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { updateStage } from '@/server/admin/stages';
import { stageUpdateSchema, type StageUpdateInput } from '@request-tracker/shared';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/stages/:id - Update a stage
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('stage:manage');
    const { id } = await params;

    const { data, error } = await parseBody(request, stageUpdateSchema);
    if (error) return error;

    const stage = await updateStage(id, data as StageUpdateInput, user.id);
    if (!stage) return notFound('Stage');

    return apiSuccess(stage);
  } catch (error) {
    return handleAuthError(error);
  }
}
