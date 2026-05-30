import { body, param, query } from 'express-validator';

export const createNotificationRules = [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3–200 characters'),
  body('body').trim().isLength({ min: 10, max: 2000 }).withMessage('Message must be 10–2000 characters'),
  body('type')
    .isIn(['general', 'result', 'election', 'payment', 'system'])
    .withMessage('type must be general, result, election, payment, or system'),
  body('target')
    .isIn(['all', 'level'])
    .withMessage('target must be all or level'),
  body('targetLevel')
    .if(body('target').equals('level'))
    .isIn(['L100', 'L200', 'L300', 'L400'])
    .withMessage('targetLevel must be L100, L200, L300, or L400 when target is level'),
  body('send').isBoolean().withMessage('send must be a boolean'),
];

export const listNotificationsRules = [
  query('status').optional().isIn(['sent', 'draft']).withMessage('status must be sent or draft'),
];

export const notificationIdRule = [param('id').isUUID()];
