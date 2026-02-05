import { z } from 'zod';
import { Priority, FlowType } from '../types/enums';

export const prioritySchema = z.enum([
  Priority.LOW,
  Priority.NORMAL,
  Priority.HIGH,
  Priority.URGENT,
]);

export const flowTypeSchema = z.enum([FlowType.ORDER, FlowType.CONTRACT]);

export const requestCreateSchema = z.object({
  description: z.string().min(1, 'Description is required').max(5000),
  notes: z.string().max(10000).nullish(),
  priority: prioritySchema.default(Priority.NORMAL),
  dueDate: z.string().datetime().nullish(),
  flowType: flowTypeSchema,
  ownerUserId: z.string().uuid().nullish(),
  tagIds: z.array(z.string().uuid()).optional().default([]),
});

export type RequestCreateSchema = z.infer<typeof requestCreateSchema>;

export const requestUpdateSchema = z.object({
  description: z.string().min(1).max(5000).optional(),
  notes: z.string().max(10000).nullish(),
  priority: prioritySchema.optional(),
  dueDate: z.string().datetime().nullish(),
  ownerUserId: z.string().uuid().nullish(),
});

export type RequestUpdateSchema = z.infer<typeof requestUpdateSchema>;

export const moveStageSchema = z.object({
  toStageId: z.string().uuid('Invalid stage ID'),
  reason: z.string().max(1000).optional(),
});

export type MoveStageSchema = z.infer<typeof moveStageSchema>;

export const requestFiltersSchema = z.object({
  query: z.string().max(200).optional(),
  stageId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  priority: prioritySchema.optional(),
  flowType: flowTypeSchema.optional(),
  dueBefore: z.string().optional(),
  dueAfter: z.string().optional(),
  ownerId: z.string().uuid().optional(),
});

export type RequestFiltersSchema = z.infer<typeof requestFiltersSchema>;

export const requestTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()),
});

export type RequestTagsSchema = z.infer<typeof requestTagsSchema>;
