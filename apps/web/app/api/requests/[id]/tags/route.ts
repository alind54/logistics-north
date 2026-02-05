import { NextRequest } from 'next/server';
import { apiSuccess, parseBody, handleAuthError, notFound } from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { getRequestById, updateRequestTags } from '@/server/requests';
import { requestTagsSchema } from '@request-tracker/shared';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/requests/:id/tags - Update tags for a request
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('request:update');
    const { id } = await params;

    // Check request exists
    const existing = await getRequestById(id);
    if (!existing) {
      return notFound('Request');
    }

    const { data, error } = await parseBody(request, requestTagsSchema);
    if (error) return error;

    await updateRequestTags(id, data.tagIds, user.id);

    // Fetch updated request to return current tags
    const updated = await getRequestById(id);

    return apiSuccess({ tags: updated?.tags ?? [] });
  } catch (error) {
    return handleAuthError(error);
  }
}
