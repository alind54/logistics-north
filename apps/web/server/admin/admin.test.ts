import { describe, it, expect } from 'vitest';
import { hasPermission } from '../auth/rbac';
import type { Permission } from '../auth/rbac';

describe('Admin RBAC', () => {
  describe('Stage management permissions', () => {
    it('should allow ADMIN to manage stages', () => {
      expect(hasPermission('ADMIN', 'stage:manage')).toBe(true);
    });

    it('should deny MANAGER from managing stages', () => {
      expect(hasPermission('MANAGER', 'stage:manage')).toBe(false);
    });

    it('should deny OPERATOR from managing stages', () => {
      expect(hasPermission('OPERATOR', 'stage:manage')).toBe(false);
    });

    it('should deny VIEWER from managing stages', () => {
      expect(hasPermission('VIEWER', 'stage:manage')).toBe(false);
    });
  });

  describe('Transition management permissions', () => {
    it('should allow ADMIN to manage transitions', () => {
      expect(hasPermission('ADMIN', 'transition:manage')).toBe(true);
    });

    it('should deny MANAGER from managing transitions', () => {
      expect(hasPermission('MANAGER', 'transition:manage')).toBe(false);
    });
  });

  describe('Tag management permissions', () => {
    it('should allow ADMIN to manage tags', () => {
      expect(hasPermission('ADMIN', 'tag:manage')).toBe(true);
    });

    it('should allow MANAGER to manage tags', () => {
      expect(hasPermission('MANAGER', 'tag:manage')).toBe(true);
    });

    it('should deny OPERATOR from managing tags', () => {
      expect(hasPermission('OPERATOR', 'tag:manage')).toBe(false);
    });

    it('should deny VIEWER from managing tags', () => {
      expect(hasPermission('VIEWER', 'tag:manage')).toBe(false);
    });
  });

  describe('User management permissions', () => {
    it('should allow ADMIN to manage users', () => {
      expect(hasPermission('ADMIN', 'user:manage')).toBe(true);
    });

    it('should deny MANAGER from managing users', () => {
      expect(hasPermission('MANAGER', 'user:manage')).toBe(false);
    });

    it('should deny OPERATOR from managing users', () => {
      expect(hasPermission('OPERATOR', 'user:manage')).toBe(false);
    });
  });

  describe('Audit log permissions', () => {
    it('should allow ADMIN to read audit logs', () => {
      expect(hasPermission('ADMIN', 'audit:read')).toBe(true);
    });

    it('should allow MANAGER to read audit logs', () => {
      expect(hasPermission('MANAGER', 'audit:read')).toBe(true);
    });

    it('should deny OPERATOR from reading audit logs', () => {
      expect(hasPermission('OPERATOR', 'audit:read')).toBe(false);
    });

    it('should deny VIEWER from reading audit logs', () => {
      expect(hasPermission('VIEWER', 'audit:read')).toBe(false);
    });
  });

  describe('Full admin permission matrix', () => {
    const adminOnlyPermissions: Permission[] = ['stage:manage', 'transition:manage', 'user:manage'];
    const managerPermissions: Permission[] = ['tag:manage', 'audit:read'];

    it('should restrict admin-only permissions to ADMIN role', () => {
      for (const perm of adminOnlyPermissions) {
        expect(hasPermission('ADMIN', perm)).toBe(true);
        expect(hasPermission('MANAGER', perm)).toBe(false);
        expect(hasPermission('OPERATOR', perm)).toBe(false);
        expect(hasPermission('VIEWER', perm)).toBe(false);
      }
    });

    it('should allow ADMIN and MANAGER for manager-level permissions', () => {
      for (const perm of managerPermissions) {
        expect(hasPermission('ADMIN', perm)).toBe(true);
        expect(hasPermission('MANAGER', perm)).toBe(true);
        expect(hasPermission('OPERATOR', perm)).toBe(false);
        expect(hasPermission('VIEWER', perm)).toBe(false);
      }
    });
  });
});
