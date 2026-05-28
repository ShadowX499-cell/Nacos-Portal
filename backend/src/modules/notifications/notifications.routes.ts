import { Router } from 'express';
import { authenticate, requireStudent } from '../../middleware/auth.middleware';
import { apiRateLimit } from '../../middleware/rate-limit.middleware';
import { listNotifications, markRead, markAllRead, getUnreadCount } from './notifications.controller';

const router = Router();
router.use(authenticate, requireStudent, apiRateLimit);

/** GET  /api/v1/notifications/unread-count — MUST be before /:id */
router.get('/unread-count', getUnreadCount);

/** GET  /api/v1/notifications */
router.get('/', listNotifications);

/** POST /api/v1/notifications/read-all */
router.post('/read-all', markAllRead);

/** POST /api/v1/notifications/:id/read */
router.post('/:id/read', markRead);

export default router;
