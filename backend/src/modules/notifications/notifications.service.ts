import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';

export interface NotificationPublic {
  id: string;
  title: string;
  body: string;
  type: string;
  target: string;
  isRead: boolean;
  createdAt: Date;
}

export class NotificationsService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async listNotifications(
    userId: string,
    departmentId: string,
    level: string
  ): Promise<NotificationPublic[]> {
    const reads = await this.db.notificationRead.findMany({
      where: { userId },
      select: { notificationId: true },
    });
    const readIds = new Set(reads.map((r) => r.notificationId));

    const notifications = await this.db.notification.findMany({
      where: {
        departmentId,
        isSent: true,
        OR: [
          { target: 'all' },
          { target: 'level', targetLevel: level as import('@prisma/client').Level },
          { target: 'individual', targetUserId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      target: n.target,
      isRead: readIds.has(n.id),
      createdAt: n.createdAt,
    }));
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.db.notificationRead.upsert({
      where: { notificationId_userId: { notificationId, userId } },
      create: { notificationId, userId },
      update: {},
    });
  }

  async markAllRead(userId: string, departmentId: string, level: string): Promise<void> {
    const notifications = await this.db.notification.findMany({
      where: {
        departmentId,
        isSent: true,
        OR: [
          { target: 'all' },
          { target: 'level', targetLevel: level as import('@prisma/client').Level },
          { target: 'individual', targetUserId: userId },
        ],
      },
      select: { id: true },
    });

    await this.db.$transaction(
      notifications.map((n) =>
        this.db.notificationRead.upsert({
          where: { notificationId_userId: { notificationId: n.id, userId } },
          create: { notificationId: n.id, userId },
          update: {},
        })
      )
    );
  }

  async getUnreadCount(
    userId: string,
    departmentId: string,
    level: string
  ): Promise<{ count: number }> {
    const total = await this.db.notification.count({
      where: {
        departmentId,
        isSent: true,
        OR: [
          { target: 'all' },
          { target: 'level', targetLevel: level as import('@prisma/client').Level },
          { target: 'individual', targetUserId: userId },
        ],
      },
    });

    const readCount = await this.db.notificationRead.count({ where: { userId } });
    return { count: Math.max(0, total - readCount) };
  }
}

export const notificationsService = new NotificationsService();
