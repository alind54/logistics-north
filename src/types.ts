export type AppRole = 'admin' | 'manager' | 'logistics';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  created_at: string;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
  position?: number;
}

export interface Request {
  id: string;
  stage: string;
  description: string;
  notes: string;
  created_by: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  task: string;
  notes: string;
  completed: boolean;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export type TabId = 'requests' | 'todos';
