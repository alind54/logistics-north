import { describe, it, expect } from 'vitest';
import { loginSchema, passwordSchema } from './auth';

describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    it('should accept valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should lowercase and trim email', () => {
      const result = loginSchema.safeParse({
        email: '  Test@Example.COM  ',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should reject invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('should accept valid password', () => {
      const result = passwordSchema.safeParse('ValidPassword123');
      expect(result.success).toBe(true);
    });

    it('should reject password shorter than 12 characters', () => {
      const result = passwordSchema.safeParse('Short1A');
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = passwordSchema.safeParse('ALLUPPERCASE123');
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = passwordSchema.safeParse('alllowercase123');
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = passwordSchema.safeParse('NoNumbersHere');
      expect(result.success).toBe(false);
    });
  });
});
