import { AuditEventType } from '@request-tracker/shared';
import { getSession, destroySession } from '@/server/auth/session';
import { createAuditEvent } from '@/server/audit';
import { apiSuccess, serverError } from '@/server/api-utils';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const session = await getSession();

    if (session.user) {
      const userId = session.user.id;
      await createAuditEvent(AuditEventType.USER_LOGOUT, userId, null);
      logger.audit('LOGOUT', userId, { email: session.user.email });
    }

    await destroySession();

    return apiSuccess({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
