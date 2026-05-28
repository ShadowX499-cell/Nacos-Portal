import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';

const mockNotif1 = {
  id: 'notif-1', departmentId: 'dept-1', title: 'Result Published',
  body: 'Your 2024/25 S1 result is ready.', type: 'result' as const,
  target: 'all' as const, targetLevel: null, targetUserId: null,
  isSent: true, sentAt: new Date(), createdById: 'admin-1', createdAt: new Date(),
};
const mockNotif2 = {
  id: 'notif-2', departmentId: 'dept-1', title: 'Election Notice',
  body: 'Elections open tomorrow.', type: 'election' as const,
  target: 'all' as const, targetLevel: null, targetUserId: null,
  isSent: true, sentAt: new Date(), createdById: 'admin-1', createdAt: new Date(),
};

const prismaMock = {
  notificationRead: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  notification: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
  user: {
    findUnique: vi.fn(),
  },
};

let service: NotificationsService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new NotificationsService(prismaMock as unknown as import('@prisma/client').PrismaClient);
});

describe('NotificationsService.listNotifications', () => {
  it('attaches isRead:true for already-read notifications', async () => {
    prismaMock.notificationRead.findMany.mockResolvedValue([{ notificationId: 'notif-1' }]);
    prismaMock.notification.findMany.mockResolvedValue([mockNotif1, mockNotif2]);

    const result = await service.listNotifications('user-1', 'dept-1', 'L200');
    expect(result[0].isRead).toBe(true);
    expect(result[1].isRead).toBe(false);
  });

  it('returns empty array when no notifications exist', async () => {
    prismaMock.notificationRead.findMany.mockResolvedValue([]);
    prismaMock.notification.findMany.mockResolvedValue([]);
    const result = await service.listNotifications('user-1', 'dept-1', 'L200');
    expect(result).toEqual([]);
  });
});

describe('NotificationsService.markRead', () => {
  it('upserts a NotificationRead record', async () => {
    prismaMock.notificationRead.upsert.mockResolvedValue({});
    await service.markRead('notif-1', 'user-1');
    expect(prismaMock.notificationRead.upsert).toHaveBeenCalledWith({
      where: { notificationId_userId: { notificationId: 'notif-1', userId: 'user-1' } },
      create: { notificationId: 'notif-1', userId: 'user-1' },
      update: {},
    });
  });
});

describe('NotificationsService.getUnreadCount', () => {
  it('returns total minus read count', async () => {
    prismaMock.notification.count.mockResolvedValue(5);
    prismaMock.notificationRead.count.mockResolvedValue(2);
    const result = await service.getUnreadCount('user-1', 'dept-1', 'L200');
    expect(result.count).toBe(3);
  });
});

describe('NotificationsService.markAllRead', () => {
  it('runs a transaction upsert for all visible notifications', async () => {
    prismaMock.notification.findMany.mockResolvedValue([{ id: 'notif-1' }, { id: 'notif-2' }]);
    prismaMock.$transaction.mockResolvedValue([]);
    prismaMock.notificationRead.upsert.mockResolvedValue({});

    await service.markAllRead('user-1', 'dept-1', 'L200');
    expect(prismaMock.notification.findMany).toHaveBeenCalled();
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });
});
