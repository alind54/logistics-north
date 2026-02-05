import { z } from 'zod';

export const tagCreateSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex code like #FF0000').nullish(),
});

export type TagCreateSchema = z.infer<typeof tagCreateSchema>;

export const tagUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex code').nullish(),
});

export type TagUpdateSchema = z.infer<typeof tagUpdateSchema>;
