import { describe, it, expect } from 'vitest';
import { hasRole, hasPermission } from './rbac';

describe('RBAC', () => {
  describe('hasRole', () => {
    it('ADMIN should have all roles', () => {
      expect(hasRole('ADMIN', 'ADMIN')).toBe(true);
      expect(hasRole('ADMIN', 'MANAGER')).toBe(true);
      expect(hasRole('ADMIN', 'OPERATOR')).toBe(true);
      expect(hasRole('ADMIN', 'VIEWER')).toBe(true);
    });

    it('MANAGER should not have ADMIN role', () => {
      expect(hasRole('MANAGER', 'ADMIN')).toBe(false);
      expect(hasRole('MANAGER', 'MANAGER')).toBe(true);
      expect(hasRole('MANAGER', 'OPERATOR')).toBe(true);
      expect(hasRole('MANAGER', 'VIEWER')).toBe(true);
    });

    it('OPERATOR should not have MANAGER or ADMIN roles', () => {
      expect(hasRole('OPERATOR', 'ADMIN')).toBe(false);
      expect(hasRole('OPERATOR', 'MANAGER')).toBe(false);
      expect(hasRole('OPERATOR', 'OPERATOR')).toBe(true);
      expect(hasRole('OPERATOR', 'VIEWER')).toBe(true);
    });

    it('VIEWER should only have VIEWER role', () => {
      expect(hasRole('VIEWER', 'ADMIN')).toBe(false);
      expect(hasRole('VIEWER', 'MANAGER')).toBe(false);
      expect(hasRole('VIEWER', 'OPERATOR')).toBe(false);
      expect(hasRole('VIEWER', 'VIEWER')).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('ADMIN should have all permissions', () => {
      expect(hasPermission('ADMIN', 'request:create')).toBe(true);
      expect(hasPermission('ADMIN', 'request:delete')).toBe(true);
      expect(hasPermission('ADMIN', 'stage:manage')).toBe(true);
      expect(hasPermission('ADMIN', 'user:manage')).toBe(true);
    });

    it('MANAGER should not have admin-only permissions', () => {
      expect(hasPermission('MANAGER', 'request:create')).toBe(true);
      expect(hasPermission('MANAGER', 'request:delete')).toBe(true);
      expect(hasPermission('MANAGER', 'stage:manage')).toBe(false);
      expect(hasPermission('MANAGER', 'user:manage')).toBe(false);
    });

    it('OPERATOR should have basic request permissions', () => {
      expect(hasPermission('OPERATOR', 'request:create')).toBe(true);
      expect(hasPermission('OPERATOR', 'request:read')).toBe(true);
      expect(hasPermission('OPERATOR', 'request:update')).toBe(true);
      expect(hasPermission('OPERATOR', 'request:delete')).toBe(false);
      expect(hasPermission('OPERATOR', 'stage:manage')).toBe(false);
    });

    it('VIEWER should only have read permissions', () => {
      expect(hasPermission('VIEWER', 'request:read')).toBe(true);
      expect(hasPermission('VIEWER', 'attachment:download')).toBe(true);
      expect(hasPermission('VIEWER', 'request:create')).toBe(false);
      expect(hasPermission('VIEWER', 'request:update')).toBe(false);
    });
  });
});
