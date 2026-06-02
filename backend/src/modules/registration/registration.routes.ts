import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireStudent, requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { apiRateLimit } from '../../middleware/rate-limit.middleware';
import { Semester } from '@prisma/client';
import {
  upload,
  listRegistrations,
  submitRegistration,
  submitSchoolFeeReceipt,
  listAllRegistrations,
  reviewRegistration,
  getPendingCount,
} from './registration.controller';

const router = Router();

const sessionSemesterRules = [
  body('session').matches(/^\d{4}\/\d{4}$/).withMessage('Session must be YYYY/YYYY'),
  body('semester').isIn(Object.values(Semester)).withMessage('Invalid semester'),
];

/** Student routes */
router.get('/', authenticate, requireStudent, apiRateLimit, listRegistrations);

router.post(
  '/',
  authenticate, requireStudent, apiRateLimit,
  upload.single('file'),
  validate(sessionSemesterRules),
  submitRegistration
);

router.post(
  '/school-fee-receipt',
  authenticate, requireStudent, apiRateLimit,
  upload.single('file'),
  validate(sessionSemesterRules),
  submitSchoolFeeReceipt
);

/** Admin routes */
/** GET /api/v1/registration/admin/pending-count */
router.get('/admin/pending-count', authenticate, requireAdmin, apiRateLimit, getPendingCount);

router.get('/admin', authenticate, requireAdmin, apiRateLimit, listAllRegistrations);

router.patch(
  '/admin/:id/review',
  authenticate, requireAdmin, apiRateLimit,
  validate([
    body('status').isIn(['verified', 'rejected']).withMessage('Status must be verified or rejected'),
    body('reviewNote').optional().isString().isLength({ max: 500 }),
  ]),
  reviewRegistration
);

export default router;
