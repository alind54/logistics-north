import { NextRequest } from 'next/server';
import { apiSuccess, handleAuthError, parseBody, badRequest } from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { listUsers, createUser } from '@/server/admin/users';
import { userCreateSchema } from '@request-tracker/shared';

// GET /api/admin/users - List all users
export async function GET(_request: NextRequest) {
  try {
    await requirePermission('user:manage');

    const users = await listUsers();
    return apiSuccess({ users });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/admin/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const actor = await requirePermission('user:manage');

    const { data, error } = await parseBody(request, userCreateSchema);
    if (error) return error;

    try {
      const user = await createUser(data.email, data.password, data.role, actor.id);
      return apiSuccess({ user }, 201);
    } catch (e) {
      if (e instanceof Error && e.message.includes('already exists')) {
        return badRequest(e.message);
      }
      throw e;
    }
  } catch (error) {
    return handleAuthError(error);
  }
}
