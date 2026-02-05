import { NextRequest } from 'next/server';
import {
  apiSuccess,
  parseBody,
  handleAuthError,
  badRequest,
} from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { listAllStages } from '@/server/workflow';
import { createStage } from '@/server/admin/stages';
import { stageCreateSchema, type StageCreateInput } from '@request-tracker/shared';

// GET /api/admin/stages - List all stages (admin view)
export async function GET(_request: NextRequest) {
  try {
    await requirePermission('stage:manage');

    const stages = await listAllStages();

    return apiSuccess({ stages });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/admin/stages - Create a new stage
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('stage:manage');

    const { data, error } = await parseBody(request, stageCreateSchema);
    if (error) return error;

    const stage = await createStage(data as StageCreateInput, user.id);
    return apiSuccess(stage, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return badRequest('A stage with this configuration already exists');
    }
    return handleAuthError(error);
  }
}
