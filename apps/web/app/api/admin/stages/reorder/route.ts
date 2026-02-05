import { NextRequest } from 'next/server';
import {
  apiSuccess,
  parseBody,
  handleAuthError,
} from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { reorderStages } from '@/server/admin/stages';
import { stageReorderSchema } from '@request-tracker/shared';

// POST /api/admin/stages/reorder - Reorder stages
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('stage:manage');

    const { data, error } = await parseBody(request, stageReorderSchema);
    if (error) return error;

    const stages = await reorderStages(data.stageIds, user.id);
    return apiSuccess({ stages });
  } catch (error) {
    return handleAuthError(error);
  }
}
