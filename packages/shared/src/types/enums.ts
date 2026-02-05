// User roles - matches Prisma enum
export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Request priority levels
export const Priority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type Priority = (typeof Priority)[keyof typeof Priority];

// Workflow flow types
export const FlowType = {
  ORDER: 'ORDER',
  CONTRACT: 'CONTRACT',
} as const;

export type FlowType = (typeof FlowType)[keyof typeof FlowType];

// Stage applies to
export const AppliesTo = {
  ORDER: 'ORDER',
  CONTRACT: 'CONTRACT',
  BOTH: 'BOTH',
} as const;

export type AppliesTo = (typeof AppliesTo)[keyof typeof AppliesTo];

// Audit event types
export const AuditEventType = {
  REQUEST_CREATED: 'REQUEST_CREATED',
  REQUEST_UPDATED: 'REQUEST_UPDATED',
  REQUEST_DELETED: 'REQUEST_DELETED',
  STAGE_MOVED: 'STAGE_MOVED',
  ATTACHMENT_ADDED: 'ATTACHMENT_ADDED',
  ATTACHMENT_REMOVED: 'ATTACHMENT_REMOVED',
  TAGS_UPDATED: 'TAGS_UPDATED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  STAGE_CREATED: 'STAGE_CREATED',
  STAGE_UPDATED: 'STAGE_UPDATED',
  TRANSITION_CREATED: 'TRANSITION_CREATED',
  TRANSITION_UPDATED: 'TRANSITION_UPDATED',
} as const;

export type AuditEventType = (typeof AuditEventType)[keyof typeof AuditEventType];
