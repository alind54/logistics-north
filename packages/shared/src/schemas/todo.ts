import { z } from 'zod';

export const todoCreateSchema = z.object({
  task: z.string().min(1, 'Task is required').max(500),
  notes: z.string().max(2000).nullish(),
});

export type TodoCreateInput = z.infer<typeof todoCreateSchema>;

export const todoUpdateSchema = z.object({
  task: z.string().min(1).max(500).optional(),
  notes: z.string().max(2000).nullish(),
  completed: z.boolean().optional(),
});

export type TodoUpdateInput = z.infer<typeof todoUpdateSchema>;
