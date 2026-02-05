import { prisma } from '../db';
import { AuditEventType } from '@request-tracker/shared';
import { logger } from '@/lib/logger';

interface AuditPayload {
  [key: string]: unknown;
}

export async function createAuditEvent(
  eventType: AuditEventType,
  actorUserId: string,
  requestId: string | null,
  payload?: AuditPayload
): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        eventType,
        actorUserId,
        requestId,
        payloadJson: payload ? JSON.parse(JSON.stringify(payload)) : null,
      },
    });

    logger.audit(eventType, actorUserId, {
      requestId,
      ...payload,
    });
  } catch (error) {
    // Audit failures should not break the application
    logger.error('Failed to create audit event', error, {
      eventType,
      actorUserId,
      requestId,
    });
  }
}

export async function getAuditEventsForRequest(
  requestId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<{
  events: Array<{
    id: string;
    eventType: string;
    payloadJson: unknown;
    createdAt: Date;
    actor: { id: string; email: string };
  }>;
  total: number;
}> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const [events, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        eventType: true,
        payloadJson: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }),
    prisma.auditEvent.count({ where: { requestId } }),
  ]);

  return { events, total };
}
