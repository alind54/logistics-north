import { NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { logger } from '@/lib/logger';

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export function apiError(
  statusCode: number,
  error: string,
  message: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    error,
    message,
    statusCode,
  };
  if (details !== undefined) {
    response.details = details;
  }
  return NextResponse.json(response, { status: statusCode });
}

export function unauthorized(message = 'Unauthorized'): NextResponse<ApiErrorResponse> {
  return apiError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Forbidden'): NextResponse<ApiErrorResponse> {
  return apiError(403, 'FORBIDDEN', message);
}

export function notFound(resource = 'Resource'): NextResponse<ApiErrorResponse> {
  return apiError(404, 'NOT_FOUND', `${resource} not found`);
}

export function badRequest(message: string, details?: unknown): NextResponse<ApiErrorResponse> {
  return apiError(400, 'BAD_REQUEST', message, details);
}

export function validationError(errors: ZodError): NextResponse<ApiErrorResponse> {
  return apiError(400, 'VALIDATION_ERROR', 'Validation failed', errors.flatten());
}

export function serverError(error: unknown): NextResponse<ApiErrorResponse> {
  logger.error('Internal server error', error);
  return apiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}

export function apiSuccess<T>(data: T, statusCode = 200): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, { status: statusCode });
}

export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse<ApiErrorResponse> }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return { data: null, error: validationError(result.error) };
    }

    return { data: result.data, error: null };
  } catch (e) {
    logger.error('Failed to parse request body', e);
    return { data: null, error: badRequest('Invalid JSON body') };
  }
}

export function handleAuthError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof Error) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return unauthorized(error.message);
    }
    if (error.message === 'Forbidden') {
      return forbidden();
    }
  }
  return serverError(error);
}
