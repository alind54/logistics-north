import { prisma } from '../db';

export interface NotificationDTO {
  id: string;
  title: string;
  message: string;
  type: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  linkUrl?: string
): Promise<void> {
  await prisma.notification.create({
    data: { userId, title, message, type, linkUrl: linkUrl ?? null },
  });
}

export async function createBulkNotifications(
  userIds: string[],
  title: string,
  message: string,
  type: string,
  linkUrl?: string
): Promise<void> {
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title,
      message,
      type,
      linkUrl: linkUrl ?? null,
    })),
  });
}

export async function getNotificationsForUser(
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<{ notifications: NotificationDTO[]; unreadCount: number }> {
  const limit = options?.limit ?? 20;
  const where = {
    userId,
    ...(options?.unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        linkUrl: true,
        isRead: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    notifications: notifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  };
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  });
  return result.count > 0;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return result.count;
}
