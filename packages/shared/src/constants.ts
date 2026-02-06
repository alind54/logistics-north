import { UserRole } from './types/enums';

// Role hierarchy for permission checks (higher index = more permissions)
export const ROLE_HIERARCHY: Record<string, number> = {
  [UserRole.VIEWER]: 0,
  [UserRole.OPERATOR]: 1,
  [UserRole.MANAGER]: 2,
  [UserRole.ADMIN]: 3,
};

// Roles that can create/edit requests
export const REQUEST_WRITE_ROLES = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OPERATOR,
] as const;

// Roles that can manage workflows (stages/transitions)
export const WORKFLOW_ADMIN_ROLES = [UserRole.ADMIN] as const;

// Roles that can manage users
export const USER_ADMIN_ROLES = [UserRole.ADMIN] as const;

// Session configuration
export const SESSION_CONFIG = {
  COOKIE_NAME: 'request-tracker-session',
  MAX_AGE_SECONDS: 60 * 60 * 24 * 7, // 7 days
  IDLE_TIMEOUT_SECONDS: 60 * 60 * 2, // 2 hours
} as const;

// Rate limiting
export const RATE_LIMIT = {
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes
} as const;

// File upload constraints
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ] as const,
} as const;

// MRF number formatting
export function formatMrfNumber(n: number): string {
  return `MRF-${n.toString().padStart(3, '0')}`;
}
