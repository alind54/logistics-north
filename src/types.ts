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
  is_urgent?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
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
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface Attachment {
  id: string;
  request_id: string;
  project_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  project_id: string | null;
  user_id: string;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  user_email?: string;
  user_name?: string;
  project_name?: string;
}

export type TabId = 'requests' | 'todos' | 'dashboard';
