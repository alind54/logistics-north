import { NextRequest } from 'next/server';
import { apiSuccess, handleAuthError, notFound } from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { getRequestById } from '@/server/requests';
import { getAuditEventsForRequest } from '@/server/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/requests/:id/audit - Get audit events for a request
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission('audit:read');
    const { id } = await params;

    // Check request exists
    const existing = await getRequestById(id);
    if (!existing) {
      return notFound('Request');
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));

    const result = await getAuditEventsForRequest(id, { limit, offset });

    return apiSuccess({
      events: result.events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        payload: e.payloadJson,
        createdAt: e.createdAt.toISOString(),
        actor: e.actor,
      })),
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
