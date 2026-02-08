import { NextRequest } from 'next/server';
import { apiSuccess, parseBody, handleAuthError } from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { clearDoneRequests } from '@/server/requests';
import { flowTypeSchema } from '@request-tracker/shared';
import { z } from 'zod';
import { eventBus, BOARD_CHANNEL } from '@/server/events';

const clearDoneSchema = z.object({
  flowType: flowTypeSchema,
});

// POST /api/requests/clear-done - Clear all requests in Done stage
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('request:delete');

    const { data, error } = await parseBody(request, clearDoneSchema);
    if (error) return error;

    const count = await clearDoneRequests(data.flowType, user.id);

    eventBus.publish(BOARD_CHANNEL, {
      type: 'REQUEST_DELETED',
      payload: { bulkClear: true, count },
    });

    return apiSuccess({ cleared: count });
  } catch (error) {
    return handleAuthError(error);
  }
}
