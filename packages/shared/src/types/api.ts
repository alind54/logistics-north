export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface ApiSuccess<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    'statusCode' in response
  );
}
