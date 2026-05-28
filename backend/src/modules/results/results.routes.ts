import { Router } from 'express';
import { authenticate, requireStudent } from '../../middleware/auth.middleware';
import { apiRateLimit } from '../../middleware/rate-limit.middleware';
import { listResults, getGpa, getResult } from './results.controller';

const router = Router();

router.use(authenticate, requireStudent, apiRateLimit);

/** GET /api/v1/results */
router.get('/', listResults);

/** GET /api/v1/results/gpa — MUST be before /:gradebookId */
router.get('/gpa', getGpa);

/** GET /api/v1/results/:gradebookId */
router.get('/:gradebookId', getResult);

export default router;
