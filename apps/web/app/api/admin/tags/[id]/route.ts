import { NextRequest } from 'next/server';
import {
  apiSuccess,
  parseBody,
  handleAuthError,
  notFound,
  badRequest,
} from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { updateTag, deleteTag } from '@/server/admin/tags';
import { tagUpdateSchema } from '@request-tracker/shared';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/tags/:id - Update a tag
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission('tag:manage');
    const { id } = await params;

    const { data, error } = await parseBody(request, tagUpdateSchema);
    if (error) return error;

    const tag = await updateTag(id, data);
    if (!tag) return notFound('Tag');

    return apiSuccess(tag);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return badRequest('A tag with this name already exists');
    }
    return handleAuthError(error);
  }
}

// DELETE /api/admin/tags/:id - Delete a tag
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission('tag:manage');
    const { id } = await params;

    const deleted = await deleteTag(id);
    if (!deleted) return notFound('Tag');

    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
