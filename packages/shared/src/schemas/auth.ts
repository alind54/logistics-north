import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .transform((v) => v.toLowerCase().trim())
    .pipe(z.string().email('Invalid email address')),
  password: z.string().min(1, 'Password is required'),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .transform((v) => v.toLowerCase().trim())
    .pipe(z.string().email('Invalid email address')),
  password: passwordSchema,
});

export type RegisterSchema = z.infer<typeof registerSchema>;
