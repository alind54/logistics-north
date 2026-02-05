import type { UserRole } from './enums';

export interface UserDTO {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface UserCreateInput {
  email: string;
  password: string;
  role: UserRole;
}

export interface UserUpdateInput {
  email?: string;
  role?: UserRole;
  password?: string;
}
