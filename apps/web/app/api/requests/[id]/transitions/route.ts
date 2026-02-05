import { NextRequest } from 'next/server';
import { apiSuccess, handleAuthError, notFound } from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { getRequestById } from '@/server/requests';
import { getAvailableTransitions, getStageById } from '@/server/workflow';
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

    // Get available transitions from current stage
    const transitions = await getAvailableTransitions(
      existing.currentStage.id,
      existing.flowType as FlowType
    );

    // Get stage details for each transition
    const transitionsWithStages = await Promise.all(
      transitions.map(async (t) => {
        const stage = await getStageById(t.toStageId);
        return {
          ...t,
          toStage: stage
            ? {
                id: stage.id,
                name: stage.name,
                orderIndex: stage.orderIndex,
              }
            : null,
        };
      })
    );

    return apiSuccess({
      currentStage: existing.currentStage,
      availableTransitions: transitionsWithStages.filter((t) => t.toStage !== null),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
