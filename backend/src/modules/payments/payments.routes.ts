import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireStudent } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { apiRateLimit } from '../../middleware/rate-limit.middleware';
import { initiatePayment, verifyPayment, handleWebhook, getPaymentHistory, initiateSchoolFees, getSchoolFeesStatus } from './payments.controller';

const router = Router();

/** POST /api/v1/payments/webhook — no JWT auth, raw body handled in app.ts */
router.post('/webhook', handleWebhook);

// All other routes require student auth
router.use(authenticate, requireStudent, apiRateLimit);

/** POST /api/v1/payments/initiate */
router.post(
  '/initiate',
  validate([body('gradebookId').isUUID().withMessage('gradebookId must be a valid UUID')]),
  initiatePayment
);

/** POST /api/v1/payments/school-fees/initiate */
router.post(
  '/school-fees/initiate',
  validate([body('sessionYear').matches(/^\d{4}\/\d{4}$/).withMessage('sessionYear must be YYYY/YYYY')]),
  initiateSchoolFees
);

/** GET /api/v1/payments/school-fees/status */
router.get('/school-fees/status', getSchoolFeesStatus);

/** GET /api/v1/payments/verify/:reference */
router.get(
  '/verify/:reference',
  validate([param('reference').isString().isLength({ min: 10 }).withMessage('Invalid payment reference')]),
  verifyPayment
);

/** GET /api/v1/payments */
router.get('/', getPaymentHistory);

export default router;
