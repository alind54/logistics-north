import { NextRequest } from 'next/server';
import { apiSuccess, handleAuthError, badRequest } from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { listRequestsForBoard } from '@/server/requests';
import { FlowType } from '@request-tracker/shared';

// GET /api/board - Get board data (stages with requests) for a flow type
export async function GET(request: NextRequest) {
  try {
    await requirePermission('request:read');

    const searchParams = request.nextUrl.searchParams;
    const flowType = searchParams.get('flowType') as FlowType | null;

    if (!flowType) {
      return badRequest('flowType query parameter is required');
    }

    if (!['ORDER', 'CONTRACT'].includes(flowType)) {
      return badRequest('Invalid flow type');
    }

    const columns = await listRequestsForBoard(flowType);

    const response = apiSuccess({ columns, flowType });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    return handleAuthError(error);
  }
}
