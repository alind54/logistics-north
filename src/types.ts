export interface Stage {
  id: string;
  name: string;
  color: string;
}

export interface Request {
  id: number;
  stage: string;
  description: string;
  notes: string;
}

export interface Todo {
  id: number;
  task: string;
  notes: string;
  completed: boolean;
}

export type TabId = 'requests' | 'todos';
