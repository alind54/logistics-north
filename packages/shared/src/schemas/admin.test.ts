import { describe, it, expect } from 'vitest';
import { tagCreateSchema, tagUpdateSchema } from './tag';
import { userUpdateRoleSchema } from './user';
import { stageCreateSchema, stageReorderSchema } from './stage';
import { transitionCreateSchema } from './stage';

describe('Tag Schemas', () => {
  describe('tagCreateSchema', () => {
    it('should accept valid tag with name and color', () => {
      const result = tagCreateSchema.safeParse({ name: 'Urgent', color: '#FF0000' });
      expect(result.success).toBe(true);
    });

    it('should accept tag with name only', () => {
      const result = tagCreateSchema.safeParse({ name: 'Urgent' });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = tagCreateSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject name over 50 characters', () => {
      const result = tagCreateSchema.safeParse({ name: 'a'.repeat(51) });
      expect(result.success).toBe(false);
    });

    it('should reject invalid hex color', () => {
      const result = tagCreateSchema.safeParse({ name: 'Test', color: 'red' });
      expect(result.success).toBe(false);
    });

    it('should accept valid hex color', () => {
      const result = tagCreateSchema.safeParse({ name: 'Test', color: '#AABBCC' });
      expect(result.success).toBe(true);
    });
  });

  describe('tagUpdateSchema', () => {
    it('should accept partial update with name only', () => {
      const result = tagUpdateSchema.safeParse({ name: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('should accept partial update with color only', () => {
      const result = tagUpdateSchema.safeParse({ color: '#00FF00' });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = tagUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe('User Schemas', () => {
  describe('userUpdateRoleSchema', () => {
    it('should accept valid role ADMIN', () => {
      const result = userUpdateRoleSchema.safeParse({ role: 'ADMIN' });
      expect(result.success).toBe(true);
    });

    it('should accept valid role VIEWER', () => {
      const result = userUpdateRoleSchema.safeParse({ role: 'VIEWER' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
      const result = userUpdateRoleSchema.safeParse({ role: 'SUPERADMIN' });
      expect(result.success).toBe(false);
    });

    it('should reject missing role', () => {
      const result = userUpdateRoleSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

describe('Stage Schemas', () => {
  describe('stageCreateSchema', () => {
    it('should accept valid stage', () => {
      const result = stageCreateSchema.safeParse({
        name: 'New Stage',
        orderIndex: 5,
        appliesTo: 'BOTH',
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative orderIndex', () => {
      const result = stageCreateSchema.safeParse({
        name: 'Stage',
        orderIndex: -1,
        appliesTo: 'ORDER',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('stageReorderSchema', () => {
    it('should accept array of UUIDs', () => {
      const result = stageReorderSchema.safeParse({
        stageIds: ['550e8400-e29b-41d4-a716-446655440000'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty array', () => {
      const result = stageReorderSchema.safeParse({ stageIds: [] });
      expect(result.success).toBe(false);
    });
  });

  describe('transitionCreateSchema', () => {
    it('should accept valid transition', () => {
      const result = transitionCreateSchema.safeParse({
        fromStageId: '550e8400-e29b-41d4-a716-446655440000',
        toStageId: '550e8400-e29b-41d4-a716-446655440001',
        appliesTo: 'ORDER',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = transitionCreateSchema.safeParse({
        fromStageId: 'not-a-uuid',
        toStageId: '550e8400-e29b-41d4-a716-446655440001',
        appliesTo: 'ORDER',
      });
      expect(result.success).toBe(false);
    });
  });
});
