import { NextRequest } from 'next/server';
import { loginSchema, AuditEventType } from '@request-tracker/shared';
import { prisma } from '@/server/db';
import { verifyPassword, createSession } from '@/server/auth';
import { checkLoginRateLimit, recordFailedLogin, resetLoginAttempts } from '@/server/auth/rate-limit';
import { createAuditEvent } from '@/server/audit';
import {
  parseBody,
  apiSuccess,
  badRequest,
  unauthorized,
  serverError,
} from '@/server/api-utils';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const { data: body, error: parseError } = await parseBody(request, loginSchema);
    if (parseError) return parseError;

    const { email, password } = body;

    // Check rate limit
    const rateLimit = await checkLoginRateLimit(email);
    if (!rateLimit.allowed) {
      const retryAfter = rateLimit.lockedUntil
        ? Math.ceil((rateLimit.lockedUntil.getTime() - Date.now()) / 1000)
        : 60;

      return badRequest(
        `Account temporarily locked. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
      },
    });

    if (!user) {
      // Don't reveal whether user exists
      logger.audit('LOGIN_FAILED_USER_NOT_FOUND', null, { email });
      return unauthorized('Invalid email or password');
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      await recordFailedLogin(email);
      await createAuditEvent(AuditEventType.USER_LOGIN_FAILED, user.id, null, {
        reason: 'Invalid password',
      });
      return unauthorized('Invalid email or password');
    }

    // Reset failed attempts on successful login
    await resetLoginAttempts(email);

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session
    await createSession({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Create audit event
    await createAuditEvent(AuditEventType.USER_LOGIN, user.id, null, {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    logger.audit('LOGIN_SUCCESS', user.id, { email: user.email });

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
