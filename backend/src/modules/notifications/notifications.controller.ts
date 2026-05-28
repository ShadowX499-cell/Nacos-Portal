import { Request, Response } from 'express';
import { notificationsService } from './notifications.service';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest } from '../../types';
import { prisma } from '../../config/prisma';

async function getStudentLevel(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { level: true } });
  return user?.level ?? 'L100';
}

/** GET /api/v1/notifications */
export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const level = await getStudentLevel(sub);
  const notifications = await notificationsService.listNotifications(sub, departmentId, level);
  sendSuccess(res, notifications, 'Notifications retrieved');
});

/** POST /api/v1/notifications/:id/read */
export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const { sub } = (req as AuthRequest).user;
  await notificationsService.markRead(req.params.id, sub);
  sendSuccess(res, null, 'Marked as read');
});

/** POST /api/v1/notifications/read-all */
export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const level = await getStudentLevel(sub);
  await notificationsService.markAllRead(sub, departmentId, level);
  sendSuccess(res, null, 'All notifications marked as read');
});

/** GET /api/v1/notifications/unread-count */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const level = await getStudentLevel(sub);
  const result = await notificationsService.getUnreadCount(sub, departmentId, level);
  sendSuccess(res, result, 'Unread count retrieved');
});
