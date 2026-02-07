import { NextRequest } from 'next/server';
import { apiSuccess, handleAuthError, notFound } from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { getRequestById } from '@/server/requests';
import { getAvailableTransitions } from '@/server/workflow';
import { FlowType } from '@request-tracker/shared';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/requests/:id/transitions - Get available transitions for a request
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission('request:read');
    const { id } = await params;

    // Get the request
    const existing = await getRequestById(id);
    if (!existing) {
      return notFound('Request');
    }

    // Get available transitions from current stage (includes toStage data)
    const transitions = await getAvailableTransitions(
      existing.currentStage.id,
      existing.flowType as FlowType
    );

    return apiSuccess({
      currentStage: existing.currentStage,
      availableTransitions: transitions.filter((t) => t.toStage !== null),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
