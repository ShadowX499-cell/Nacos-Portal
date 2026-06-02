import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { apiRateLimit } from '../../middleware/rate-limit.middleware';
import { photoUpload } from '../../config/multer';
import { requirePermission } from '../../middleware/permission.middleware';
import { createUserRules, listUsersRules, updateUserRules } from './admin.validation';
import { listSuperAdmins, assignSuperAdmin, revokeSuperAdmin } from './super-admins.controller';
import { listAuditLogs, listOwnAuditLogs, getAuditLogById } from './audit-logs.controller';
import { previewAdvance, advanceSemester, listTransitions } from './academic.controller';
import { getRevenue, exportRevenue } from './revenue.controller';
import {
  getDashboard,
  getActivityFeed,
  createUser,
  listUsers,
  getUserById,
  getStudentProfile,
  updateUser,
  getDepartmentSettings,
  updateDepartmentSettings,
  exportStudentLoginsPdf,
} from './admin.controller';
import {
  createNotificationRules,
  listNotificationsRules,
  notificationIdRule,
} from '../notifications/notifications-admin.validation';
import {
  createNotification,
  listNotifications,
  sendNotification,
  deleteNotification,
} from '../notifications/notifications-admin.controller';
import { body } from 'express-validator';

const router = Router();

// All admin routes require authentication + admin/super_admin role
router.use(authenticate, requireAdmin, apiRateLimit);

/** GET  /api/v1/admin/dashboard */
router.get('/dashboard', getDashboard);

/** GET /api/v1/admin/dashboard/activity */
router.get('/dashboard/activity', getActivityFeed);

/** POST /api/v1/admin/users */
router.post('/users', photoUpload.single('photo'), validate(createUserRules), createUser);

/** GET  /api/v1/admin/export/student-logins.pdf */
router.get('/export/student-logins.pdf', exportStudentLoginsPdf);

/** GET  /api/v1/admin/users */
router.get('/users', validate(listUsersRules), listUsers);

/** GET  /api/v1/admin/users/:id */
router.get('/users/:id', getUserById);

/** GET  /api/v1/admin/users/:id/profile */
router.get('/users/:id/profile', getStudentProfile);

/** PATCH /api/v1/admin/users/:id */
router.patch('/users/:id', photoUpload.single('photo'), validate(updateUserRules), updateUser);

// ── Notifications ─────────────────────────────────────────────────────────────

/** POST /api/v1/admin/notifications */
router.post('/notifications', validate(createNotificationRules), createNotification);

/** GET  /api/v1/admin/notifications */
router.get('/notifications', validate(listNotificationsRules), listNotifications);

/** PATCH /api/v1/admin/notifications/:id/send */
router.patch('/notifications/:id/send', validate(notificationIdRule), sendNotification);

/** DELETE /api/v1/admin/notifications/:id */
router.delete('/notifications/:id', validate(notificationIdRule), deleteNotification);

// ── Settings ──────────────────────────────────────────────────────────────────

/** GET  /api/v1/admin/settings/department */
router.get('/settings/department', getDepartmentSettings);

/** PATCH /api/v1/admin/settings/department */
router.patch(
  '/settings/department',
  validate([
    body('currentSession')
      .optional()
      .matches(/^\d{4}\/\d{4}$/)
      .withMessage('currentSession must be in format YYYY/YYYY'),
    body('currentSemester')
      .optional()
      .isIn(['first', 'second'])
      .withMessage('currentSemester must be first or second'),
  ]),
  updateDepartmentSettings
);

// ── Revenue (HOD only) ───────────────────────────────────────────────────────

/** GET  /api/v1/admin/revenue */
router.get('/revenue', requirePermission('view_revenue'), getRevenue);

/** GET  /api/v1/admin/revenue/export */
router.get('/revenue/export', requirePermission('view_revenue'), exportRevenue);

// ── Academic Calendar (HOD only) ─────────────────────────────────────────────

/** GET  /api/v1/admin/academic/preview */
router.get('/academic/preview', requirePermission('advance_semester'), previewAdvance);

/** POST /api/v1/admin/academic/advance */
router.post('/academic/advance', requirePermission('advance_semester'), advanceSemester);

/** GET  /api/v1/admin/academic/transitions */
router.get('/academic/transitions', requirePermission('advance_semester'), listTransitions);

// ── Super Admins (HOD only) ───────────────────────────────────────────────────

/** GET  /api/v1/admin/super-admins */
router.get('/super-admins', requirePermission('manage_super_admins'), listSuperAdmins);

/** POST /api/v1/admin/super-admins */
router.post('/super-admins', requirePermission('manage_super_admins'), assignSuperAdmin);

/** DELETE /api/v1/admin/super-admins/:id */
router.delete('/super-admins/:id', requirePermission('manage_super_admins'), revokeSuperAdmin);

// ── Audit Logs ────────────────────────────────────────────────────────────────

/** GET /api/v1/admin/audit-logs (HOD only — all logs) */
router.get('/audit-logs', requirePermission('view_all_audit_logs'), listAuditLogs);

/** GET /api/v1/admin/audit-logs/me (any super admin — own trail) */
router.get('/audit-logs/me', requirePermission('view_own_audit_log'), listOwnAuditLogs);

/** GET /api/v1/admin/audit-logs/:id (HOD only) */
router.get('/audit-logs/:id', requirePermission('view_all_audit_logs'), getAuditLogById);

export default router;
