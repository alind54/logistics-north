import { NextRequest } from 'next/server';
import { apiSuccess, handleAuthError, badRequest } from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { listStages } from '@/server/workflow';
import { FlowType } from '@request-tracker/shared';

// GET /api/stages - List stages, optionally filtered by flow type
export async function GET(request: NextRequest) {
  try {
    await requirePermission('request:read');

    const searchParams = request.nextUrl.searchParams;
    const flowType = searchParams.get('flowType') as FlowType | null;

    if (flowType && !['ORDER', 'CONTRACT'].includes(flowType)) {
      return badRequest('Invalid flow type');
    }

    const stages = await listStages(flowType ?? undefined);

    return apiSuccess({ stages });
  } catch (error) {
    return handleAuthError(error);
  }
}
