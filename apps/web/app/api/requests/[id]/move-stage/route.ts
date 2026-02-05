import { NextRequest } from 'next/server';
import {
  apiSuccess,
  parseBody,
  handleAuthError,
  notFound,
  badRequest,
} from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { getRequestById } from '@/server/requests';
import { moveStage } from '@/server/workflow';
import { moveStageSchema } from '@request-tracker/shared';
import { createNotification } from '@/server/notifications';
import { eventBus, BOARD_CHANNEL } from '@/server/events';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/requests/:id/move-stage - Move request to a new stage
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('request:move-stage');
    const { id } = await params;

    // Check request exists
    const existing = await getRequestById(id);
    if (!existing) {
      return notFound('Request');
    }

    const { data, error } = await parseBody(request, moveStageSchema);
    if (error) return error;

    const result = await moveStage(id, data.toStageId, user.id, data.reason);

    if (!result.success) {
      return badRequest(result.error ?? 'Failed to move stage');
    }

    // Notify the request owner about the stage change
    if (existing.ownerUserId && existing.ownerUserId !== user.id) {
      const desc = existing.description.length > 40
        ? existing.description.substring(0, 40) + '...'
        : existing.description;
      createNotification(
        existing.ownerUserId,
        'Request Moved',
        `"${desc}" was moved to a new stage`,
        'STAGE_CHANGE',
        `/requests/${id}`
      ).catch(() => {});
    }

    // Broadcast board update via SSE
    eventBus.publish(BOARD_CHANNEL, {
      type: 'STAGE_MOVED',
      payload: { requestId: id, toStageId: data.toStageId },
    });

    return apiSuccess(result.request);
  } catch (error) {
    return handleAuthError(error);
  }
}
