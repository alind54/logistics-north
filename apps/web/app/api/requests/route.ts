import { NextRequest } from 'next/server';
import {
  apiSuccess,
  parseBody,
  handleAuthError,
  badRequest,
} from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { createRequest, listRequests } from '@/server/requests';
import {
  requestCreateSchema,
  requestFiltersSchema,
  type RequestCreateInput,
  type RequestSortField,
  type SortDirection,
} from '@request-tracker/shared';

// GET /api/requests - List requests with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission('request:read');

    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const filterResult = requestFiltersSchema.safeParse({
      query: searchParams.get('query') ?? undefined,
      stageId: searchParams.get('stageId') ?? undefined,
      tagIds: searchParams.get('tagIds')?.split(',').filter(Boolean) ?? undefined,
      priority: searchParams.get('priority') ?? undefined,
      flowType: searchParams.get('flowType') ?? undefined,
      dueBefore: searchParams.get('dueBefore') ?? undefined,
      dueAfter: searchParams.get('dueAfter') ?? undefined,
      ownerId: searchParams.get('ownerId') ?? undefined,
    });

    if (!filterResult.success) {
      return badRequest('Invalid filter parameters', filterResult.error.flatten());
    }

    // Parse pagination
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

    // Parse sorting
    const sortField = (searchParams.get('sortField') ?? 'createdAt') as RequestSortField;
    const sortDirection = (searchParams.get('sortDirection') ?? 'desc') as SortDirection;

    const validSortFields = ['createdAt', 'updatedAt', 'dueDate', 'priority'];
    if (!validSortFields.includes(sortField)) {
      return badRequest('Invalid sort field');
    }
    if (!['asc', 'desc'].includes(sortDirection)) {
      return badRequest('Invalid sort direction');
    }

    const result = await listRequests(
      filterResult.data,
      { field: sortField, direction: sortDirection },
      page,
      pageSize
    );

    return apiSuccess({
      ...result,
      actorId: user.id,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/requests - Create a new request
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('request:create');

    const { data, error } = await parseBody(request, requestCreateSchema);
    if (error) return error;

    const newRequest = await createRequest(data as RequestCreateInput, user.id);

    return apiSuccess(newRequest, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Initial stage not found for flow type') {
      return badRequest(error.message);
    }
    return handleAuthError(error);
  }
}
