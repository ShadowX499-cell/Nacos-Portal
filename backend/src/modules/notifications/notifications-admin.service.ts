import { PrismaClient, NotificationType, NotificationTarget, Level } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import { AppError } from '../../utils/response';

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  target: string;
  targetLevel: string | null;
  imageUrl: string | null;
  isSent: boolean;
  recipientCount: number;
  createdAt: string;
  sentAt: string | null;
}

export interface CreateNotificationDto {
  title: string;
  body: string;
  type: NotificationType;
  target: NotificationTarget;
  targetLevel?: Level;
  send: boolean;
  imageUrl?: string;
}

export class AdminNotificationsService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async createNotification(
    dto: CreateNotificationDto,
    adminId: string,
    departmentId: string
  ): Promise<AdminNotification> {
    const notification = await this.db.notification.create({
      data: {
        departmentId,
        title: dto.title,
        body: dto.body,
        type: dto.type,
        target: dto.target,
        targetLevel: dto.targetLevel ?? null,
        isSent: dto.send,
        sentAt: dto.send ? new Date() : null,
        createdById: adminId,
        imageUrl: dto.imageUrl ?? null,
      },
    });

    const recipientCount = await this.countRecipients(departmentId, dto.target, dto.targetLevel);

    this.db.auditLog.create({
      data: {
        actorId: adminId,
        action: dto.send ? 'NOTIFICATION_SENT' : 'NOTIFICATION_CREATED',
        entityType: 'notification',
        entityId: notification.id,
        newValue: { title: dto.title, type: dto.type, target: dto.target, sent: dto.send } as Prisma.InputJsonValue,
      },
    }).catch((e: unknown) => console.error('[NotificationsService] Audit log failed:', e));

    return this.toPublic(notification, recipientCount);
  }

  async listNotifications(
    departmentId: string,
    status?: 'sent' | 'draft'
  ): Promise<AdminNotification[]> {
    const isSentFilter =
      status === 'sent' ? true : status === 'draft' ? false : undefined;

    const where = {
      departmentId,
      ...(isSentFilter !== undefined ? { isSent: isSentFilter } : {}),
    };

    const notifications = await this.db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      notifications.map(async (n) => {
        const recipientCount = await this.countRecipients(
          departmentId,
          n.target,
          n.targetLevel ?? undefined
        );
        return this.toPublic(n, recipientCount);
      })
    );
  }

  async sendNotification(id: string, departmentId: string, adminId: string): Promise<AdminNotification> {
    const notification = await this.db.notification.findFirst({
      where: { id, departmentId },
    });
    if (!notification) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Notification not found');
    if (notification.isSent) throw new AppError(400, 'ALREADY_SENT', 'Notification already sent');

    const updated = await this.db.notification.update({
      where: { id },
      data: { isSent: true, sentAt: new Date() },
    });

    const recipientCount = await this.countRecipients(
      departmentId,
      updated.target,
      updated.targetLevel ?? undefined
    );

    this.db.auditLog.create({
      data: {
        actorId: adminId,
        action: 'NOTIFICATION_SENT',
        entityType: 'notification',
        entityId: id,
        newValue: { sentAt: updated.sentAt?.toISOString() } as Prisma.InputJsonValue,
      },
    }).catch((e: unknown) => console.error('[NotificationsService] Audit log failed:', e));

    return this.toPublic(updated, recipientCount);
  }

  async deleteNotification(id: string, departmentId: string, adminId: string): Promise<void> {
    const notification = await this.db.notification.findFirst({
      where: { id, departmentId },
    });
    if (!notification) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Notification not found');
    if (notification.isSent) throw new AppError(400, 'NOTIFICATION_SENT', 'Cannot delete a sent notification');

    this.db.auditLog.create({
      data: {
        actorId: adminId,
        action: 'NOTIFICATION_DELETED',
        entityType: 'notification',
        entityId: id,
        newValue: { title: notification.title } as Prisma.InputJsonValue,
      },
    }).catch((e: unknown) => console.error('[NotificationsService] Audit log failed:', e));

    await this.db.notification.delete({ where: { id } });
  }

  private async countRecipients(
    departmentId: string,
    target: NotificationTarget,
    targetLevel?: Level
  ): Promise<number> {
    if (target === 'all') {
      return this.db.user.count({ where: { departmentId, role: 'student' } });
    }
    if (target === 'level' && targetLevel) {
      return this.db.user.count({ where: { departmentId, role: 'student', level: targetLevel } });
    }
    return 0;
  }

  private toPublic(
    n: {
      id: string; title: string; body: string; type: NotificationType;
      target: NotificationTarget; targetLevel: Level | null;
      imageUrl: string | null;
      isSent: boolean; sentAt: Date | null; createdAt: Date;
    },
    recipientCount: number
  ): AdminNotification {
    return {
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      target: n.target,
      targetLevel: n.targetLevel,
      imageUrl: n.imageUrl,
      isSent: n.isSent,
      recipientCount,
      createdAt: n.createdAt.toISOString(),
      sentAt: n.sentAt ? n.sentAt.toISOString() : null,
    };
  }
}

export const adminNotificationsService = new AdminNotificationsService();
