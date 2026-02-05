import { z } from 'zod';
import { UserRole } from '../types/enums';

export const userRoleSchema = z.enum([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OPERATOR,
  UserRole.VIEWER,
]);

export const userUpdateRoleSchema = z.object({
  role: userRoleSchema,
});

export const userCreateSchema = z.object({
  email: z.string().email('Must be a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: userRoleSchema,
});

export type UserUpdateRoleSchema = z.infer<typeof userUpdateRoleSchema>;
export type UserCreateSchema = z.infer<typeof userCreateSchema>;
