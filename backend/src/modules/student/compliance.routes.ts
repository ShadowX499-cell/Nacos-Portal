import { Router } from 'express';
import { authenticate, requireStudent } from '../../middleware/auth.middleware';
import { apiRateLimit } from '../../middleware/rate-limit.middleware';
import { getCompliance } from './compliance.controller';

const router = Router();

router.use(authenticate, requireStudent, apiRateLimit);

/** GET /api/v1/student/compliance */
router.get('/compliance', getCompliance);

export default router;
