import { Request, Response } from 'express';
import { adminNotificationsService } from './notifications-admin.service';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest } from '../../types';
import { NotificationType, NotificationTarget, Level } from '@prisma/client';

export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const notification = await adminNotificationsService.createNotification(
    {
      title: req.body.title as string,
      body: req.body.body as string,
      type: req.body.type as NotificationType,
      target: req.body.target as NotificationTarget,
      targetLevel: req.body.targetLevel as Level | undefined,
      send: Boolean(req.body.send),
    },
    sub,
    departmentId
  );
  sendSuccess(res, notification, notification.isSent ? 'Notification sent' : 'Draft saved', 201);
});

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const status = req.query.status as 'sent' | 'draft' | undefined;
  const notifications = await adminNotificationsService.listNotifications(departmentId, status);
  sendSuccess(res, notifications, 'Notifications retrieved');
});

export const sendNotification = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const notification = await adminNotificationsService.sendNotification(req.params.id, departmentId);
  sendSuccess(res, notification, 'Notification sent');
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  await adminNotificationsService.deleteNotification(req.params.id, departmentId);
  sendSuccess(res, null, 'Draft deleted');
});
