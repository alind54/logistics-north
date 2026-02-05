import type { AppliesTo } from './enums';

export interface StageDTO {
  id: string;
  name: string;
  orderIndex: number;
  isActive: boolean;
  appliesTo: AppliesTo;
  createdAt: string;
  updatedAt: string;
}

export interface TransitionDTO {
  id: string;
  fromStageId: string;
  toStageId: string;
  appliesTo: AppliesTo;
  isActive: boolean;
}

export interface StageCreateInput {
  name: string;
  orderIndex: number;
  appliesTo: AppliesTo;
}

export interface StageUpdateInput {
  name?: string;
  orderIndex?: number;
  isActive?: boolean;
  appliesTo?: AppliesTo;
}

export interface TransitionCreateInput {
  fromStageId: string;
  toStageId: string;
  appliesTo: AppliesTo;
}

export interface TransitionUpdateInput {
  isActive?: boolean;
  appliesTo?: AppliesTo;
}
