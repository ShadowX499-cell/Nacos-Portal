import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { apiRateLimit } from '../../middleware/rate-limit.middleware';
import { createUserRules, listUsersRules, updateUserRules } from './admin.validation';
import {
  getDashboard,
  createUser,
  listUsers,
  getUserById,
  updateUser,
} from './admin.controller';

const router = Router();

// All admin routes require authentication + admin/super_admin role
router.use(authenticate, requireAdmin, apiRateLimit);

/** GET  /api/v1/admin/dashboard */
router.get('/dashboard', getDashboard);

/** POST /api/v1/admin/users */
router.post('/users', validate(createUserRules), createUser);

/** GET  /api/v1/admin/users */
router.get('/users', validate(listUsersRules), listUsers);

/** GET  /api/v1/admin/users/:id */
router.get('/users/:id', getUserById);

/** PATCH /api/v1/admin/users/:id */
router.patch('/users/:id', validate(updateUserRules), updateUser);

export default router;
