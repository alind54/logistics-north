import { NextRequest } from 'next/server';
import {
  apiSuccess,
  parseBody,
  handleAuthError,
  notFound,
} from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { getRequestById, updateRequest, deleteRequest } from '@/server/requests';
import { requestUpdateSchema } from '@request-tracker/shared';
import { eventBus, BOARD_CHANNEL } from '@/server/events';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/requests/:id - Get request details
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission('request:read');
    const { id } = await params;

    const requestDetail = await getRequestById(id);

    if (!requestDetail) {
      return notFound('Request');
    }

    return apiSuccess(requestDetail);
  } catch (error) {
    return handleAuthError(error);
  }
}

// PATCH /api/requests/:id - Update request
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('request:update');
    const { id } = await params;

    // Check request exists
    const existing = await getRequestById(id);
    if (!existing) {
      return notFound('Request');
    }

    const { data, error } = await parseBody(request, requestUpdateSchema);
    if (error) return error;

    const updated = await updateRequest(id, data, user.id);

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'Request not found') {
      return notFound('Request');
    }
    return handleAuthError(error);
  }
}

// DELETE /api/requests/:id - Delete request
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('request:delete');
    const { id } = await params;

    const existing = await getRequestById(id);
    if (!existing) {
      return notFound('Request');
    }

    await deleteRequest(id, user.id);

    eventBus.publish(BOARD_CHANNEL, {
      type: 'REQUEST_DELETED',
      payload: { requestId: id },
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Request not found') {
      return notFound('Request');
    }
    return handleAuthError(error);
  }
}
