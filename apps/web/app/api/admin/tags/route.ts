import { NextRequest } from 'next/server';
import {
  apiSuccess,
  parseBody,
  handleAuthError,
  badRequest,
} from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { listTags, createTag } from '@/server/admin/tags';
import { tagCreateSchema } from '@request-tracker/shared';

// GET /api/admin/tags - List all tags
export async function GET(_request: NextRequest) {
  try {
    await requirePermission('tag:manage');

    const tags = await listTags();
    return apiSuccess({ tags });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/admin/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
    await requirePermission('tag:manage');

    const { data, error } = await parseBody(request, tagCreateSchema);
    if (error) return error;

    const tag = await createTag(data.name, data.color);
    return apiSuccess(tag, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return badRequest('A tag with this name already exists');
    }
    return handleAuthError(error);
  }
}
