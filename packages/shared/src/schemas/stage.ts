import { z } from 'zod';
import { AppliesTo } from '../types/enums';

export const appliesToSchema = z.enum([
  AppliesTo.ORDER,
  AppliesTo.CONTRACT,
  AppliesTo.BOTH,
]);

export const stageCreateSchema = z.object({
  name: z.string().min(1, 'Stage name is required').max(100),
  orderIndex: z.number().int().min(0),
  appliesTo: appliesToSchema,
});

export type StageCreateSchema = z.infer<typeof stageCreateSchema>;

export const stageUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  orderIndex: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  appliesTo: appliesToSchema.optional(),
});

export type StageUpdateSchema = z.infer<typeof stageUpdateSchema>;

export const stageReorderSchema = z.object({
  stageIds: z.array(z.string().min(1)).min(1),
});

export type StageReorderSchema = z.infer<typeof stageReorderSchema>;

export const transitionCreateSchema = z.object({
  fromStageId: z.string().min(1),
  toStageId: z.string().min(1),
  appliesTo: appliesToSchema,
});

export type TransitionCreateSchema = z.infer<typeof transitionCreateSchema>;

export const transitionUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  appliesTo: appliesToSchema.optional(),
});

export type TransitionUpdateSchema = z.infer<typeof transitionUpdateSchema>;
