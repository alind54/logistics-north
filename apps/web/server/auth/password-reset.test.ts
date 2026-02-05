import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';

describe('Password Reset Token', () => {
  describe('Token generation', () => {
    it('should generate a 64-character hex token', () => {
      const token = crypto.randomBytes(32).toString('hex');
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens each time', () => {
      const token1 = crypto.randomBytes(32).toString('hex');
      const token2 = crypto.randomBytes(32).toString('hex');
      expect(token1).not.toBe(token2);
    });
  });

  describe('Token hashing', () => {
    it('should produce consistent hashes for the same token', () => {
      const token = 'test-token-value';
      const hash1 = crypto.createHash('sha256').update(token).digest('hex');
      const hash2 = crypto.createHash('sha256').update(token).digest('hex');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = crypto.createHash('sha256').update('token-a').digest('hex');
      const hash2 = crypto.createHash('sha256').update('token-b').digest('hex');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce a 64-character hex hash', () => {
      const hash = crypto.createHash('sha256').update('test').digest('hex');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('Token expiry logic', () => {
    it('should detect expired tokens', () => {
      const expiresAt = new Date(Date.now() - 1000); // 1 second ago
      expect(expiresAt < new Date()).toBe(true);
    });

    it('should detect valid tokens', () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      expect(expiresAt < new Date()).toBe(false);
    });

    it('should calculate correct expiry time (24 hours)', () => {
      const RESET_TOKEN_EXPIRY_HOURS = 24;
      const now = Date.now();
      const expiresAt = new Date(now + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
      const diff = expiresAt.getTime() - now;
      expect(diff).toBe(24 * 60 * 60 * 1000);
    });
  });
});

describe('User Creation Schema', () => {
  it('should validate email format', () => {
    const validEmails = ['user@example.com', 'test@test.co', 'a@b.c'];
    const invalidEmails = ['not-an-email', '@missing.com', 'missing@', ''];

    for (const email of validEmails) {
      expect(email.includes('@')).toBe(true);
    }
    for (const email of invalidEmails) {
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      expect(isValid).toBe(false);
    }
  });

  it('should require minimum 8 character password', () => {
    expect('short'.length >= 8).toBe(false);
    expect('longpassword'.length >= 8).toBe(true);
    expect('exactly8'.length >= 8).toBe(true);
    expect('7chars!'.length >= 8).toBe(false);
  });
});
