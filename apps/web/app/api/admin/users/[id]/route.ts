import { NextRequest } from 'next/server';
import {
  apiSuccess,
  parseBody,
  handleAuthError,
  notFound,
  badRequest,
} from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { updateUserRole } from '@/server/admin/users';
import { userUpdateRoleSchema } from '@request-tracker/shared';
import type { UserRole } from '@request-tracker/shared';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/users/:id - Update user role
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const actor = await requirePermission('user:manage');
    const { id } = await params;

    const { data, error } = await parseBody(request, userUpdateRoleSchema);
    if (error) return error;

    const user = await updateUserRole(id, data.role as UserRole, actor.id);
    if (!user) return notFound('User');

    return apiSuccess(user);
  } catch (error) {
    if (error instanceof Error && error.message === 'Cannot change your own role') {
      return badRequest(error.message);
    }
    return handleAuthError(error);
  }
}
