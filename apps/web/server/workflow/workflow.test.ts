import { describe, it, expect, vi } from 'vitest';
import { calculateTimeInStage } from './index';

// Mock Prisma
vi.mock('../db', () => ({
  prisma: {
    stage: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    transition: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    stageHistory: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    request: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock audit
vi.mock('../audit', () => ({
  createAuditEvent: vi.fn(),
}));

describe('Workflow Services', () => {
  describe('calculateTimeInStage', () => {
    it('should calculate duration in milliseconds when exitedAt is provided', () => {
      const enteredAt = new Date('2024-01-01T10:00:00Z');
      const exitedAt = new Date('2024-01-01T12:00:00Z');

      const duration = calculateTimeInStage(enteredAt, exitedAt);

      // 2 hours = 7,200,000 ms
      expect(duration).toBe(7200000);
    });

    it('should calculate duration from enteredAt to now when exitedAt is null', () => {
      const enteredAt = new Date(Date.now() - 3600000); // 1 hour ago

      const duration = calculateTimeInStage(enteredAt, null);

      // Should be approximately 1 hour (allowing for test execution time)
      expect(duration).toBeGreaterThan(3600000 - 1000);
      expect(duration).toBeLessThan(3600000 + 5000);
    });

    it('should return 0 for same enteredAt and exitedAt', () => {
      const time = new Date('2024-01-01T10:00:00Z');

      const duration = calculateTimeInStage(time, time);

      expect(duration).toBe(0);
    });

    it('should handle multi-day durations correctly', () => {
      const enteredAt = new Date('2024-01-01T00:00:00Z');
      const exitedAt = new Date('2024-01-04T00:00:00Z');

      const duration = calculateTimeInStage(enteredAt, exitedAt);

      // 3 days = 259,200,000 ms
      expect(duration).toBe(259200000);
    });
  });
});

describe('Duration Formatting Helpers', () => {
  it('should format milliseconds to human-readable duration', () => {
    // Helper function to format duration
    function formatDuration(ms: number): string {
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      if (days > 0) return `${days}d ${hours % 24}h`;
      if (hours > 0) return `${hours}h`;
      const minutes = Math.floor(ms / (1000 * 60));
      return `${minutes}m`;
    }

    expect(formatDuration(1000 * 60 * 30)).toBe('30m'); // 30 minutes
    expect(formatDuration(1000 * 60 * 60 * 2)).toBe('2h'); // 2 hours
    expect(formatDuration(1000 * 60 * 60 * 26)).toBe('1d 2h'); // 26 hours
    expect(formatDuration(1000 * 60 * 60 * 48)).toBe('2d 0h'); // 48 hours
  });
});
