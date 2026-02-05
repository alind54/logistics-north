import { prisma } from '../db';
import { RATE_LIMIT } from '@request-tracker/shared';
import { logger } from '@/lib/logger';

interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil: Date | null;
}

export async function checkLoginRateLimit(email: string): Promise<RateLimitResult> {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  // If user doesn't exist, allow the attempt (will fail on auth)
  if (!user) {
    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT.LOGIN_MAX_ATTEMPTS,
      lockedUntil: null,
    };
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    logger.audit('LOGIN_BLOCKED_LOCKED', null, {
      email: normalizedEmail,
      lockedUntil: user.lockedUntil.toISOString(),
    });

    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: user.lockedUntil,
    };
  }

  // If lock has expired, reset the counter
  if (user.lockedUntil && user.lockedUntil <= new Date()) {
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT.LOGIN_MAX_ATTEMPTS,
      lockedUntil: null,
    };
  }

  const remainingAttempts = Math.max(
    0,
    RATE_LIMIT.LOGIN_MAX_ATTEMPTS - user.failedLoginAttempts
  );

  return {
    allowed: remainingAttempts > 0,
    remainingAttempts,
    lockedUntil: null,
  };
}

export async function recordFailedLogin(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { failedLoginAttempts: true },
  });

  if (!user) {
    return; // User doesn't exist, nothing to record
  }

  const newAttempts = user.failedLoginAttempts + 1;
  const shouldLock = newAttempts >= RATE_LIMIT.LOGIN_MAX_ATTEMPTS;

  await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      failedLoginAttempts: newAttempts,
      lockedUntil: shouldLock
        ? new Date(Date.now() + RATE_LIMIT.LOCKOUT_DURATION_MS)
        : null,
    },
  });

  if (shouldLock) {
    logger.audit('ACCOUNT_LOCKED', null, {
      email: normalizedEmail,
      attempts: newAttempts,
    });
  }
}

export async function resetLoginAttempts(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}
