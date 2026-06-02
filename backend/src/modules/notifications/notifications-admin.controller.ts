import { Request, Response } from 'express';
import multer from 'multer';
import { adminNotificationsService } from './notifications-admin.service';
import { uploadToS3 } from '../../utils/s3';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest } from '../../types';
import { NotificationType, NotificationTarget, Level } from '@prisma/client';

export const notifImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG images are allowed'));
    }
  },
});

export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;

  let imageUrl: string | undefined;
  if (req.file) {
    imageUrl = await uploadToS3(req.file, 'notifications');
  }

  const notification = await adminNotificationsService.createNotification(
    {
      title: req.body.title as string,
      body: req.body.body as string,
      type: req.body.type as NotificationType,
      target: req.body.target as NotificationTarget,
      targetLevel: req.body.targetLevel as Level | undefined,
      send: req.body.send === 'true' || req.body.send === true,
      imageUrl,
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
