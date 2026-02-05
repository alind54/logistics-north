import type { UserDTO } from './user';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserDTO;
}

export interface SessionUser {
  id: string;
  email: string;
  role: string;
}
