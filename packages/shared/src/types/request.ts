import type { Priority, FlowType } from './enums';
import type { StageDTO } from './stage';
import type { UserDTO } from './user';

export interface TagDTO {
  id: string;
  name: string;
  color: string | null;
}

export interface AttachmentDTO {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: Pick<UserDTO, 'id' | 'email'>;
}

export interface StageHistoryDTO {
  id: string;
  stageId: string;
  stageName: string;
  enteredAt: string;
  exitedAt: string | null;
  durationMs: number | null;
  actorUserId: string;
  moveReason: string | null;
}

export interface RequestDTO {
  id: string;
  description: string;
  notes: string | null;
  priority: Priority;
  dueDate: string | null;
  flowType: FlowType;
  currentStage: StageDTO;
  createdBy: Pick<UserDTO, 'id' | 'email'>;
  owner: Pick<UserDTO, 'id' | 'email'> | null;
  ownerUserId: string | null;
  tags: TagDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface RequestDetailDTO extends RequestDTO {
  attachments: AttachmentDTO[];
  stageHistory: StageHistoryDTO[];
}

export interface RequestListItemDTO {
  id: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  flowType: FlowType;
  currentStage: Pick<StageDTO, 'id' | 'name'>;
  owner: Pick<UserDTO, 'id' | 'email'> | null;
  tags: TagDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface RequestCreateInput {
  description: string;
  notes?: string | null;
  priority: Priority;
  dueDate?: string | null;
  flowType: FlowType;
  ownerUserId?: string | null;
  tagIds?: string[];
}

export interface RequestUpdateInput {
  description?: string;
  notes?: string | null;
  priority?: Priority;
  dueDate?: string | null;
  ownerUserId?: string | null;
}

export interface MoveStageInput {
  toStageId: string;
  reason?: string;
}

export interface RequestFilters {
  query?: string;
  stageId?: string;
  tagIds?: string[];
  priority?: Priority;
  flowType?: FlowType;
  dueBefore?: string;
  dueAfter?: string;
  ownerId?: string;
}

export type RequestSortField = 'createdAt' | 'updatedAt' | 'dueDate' | 'priority';
export type SortDirection = 'asc' | 'desc';

export interface RequestSortOptions {
  field: RequestSortField;
  direction: SortDirection;
}
