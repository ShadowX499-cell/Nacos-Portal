import { Router } from 'express';
import { authRateLimit } from '../../middleware/rate-limit.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  validateAccountRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
} from './auth.validation';
import {
  validateAccount,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
} from './auth.controller';

const router = Router();

/** POST /api/v1/auth/validate — first-time account activation */
router.post('/validate', authRateLimit, validate(validateAccountRules), validateAccount);

/** POST /api/v1/auth/login */
router.post('/login', authRateLimit, validate(loginRules), login);

/** POST /api/v1/auth/refresh — issue new access token from refresh cookie */
router.post('/refresh', refresh);

/** POST /api/v1/auth/logout */
router.post('/logout', logout);

/** POST /api/v1/auth/forgot-password */
router.post('/forgot-password', authRateLimit, validate(forgotPasswordRules), forgotPassword);

/** POST /api/v1/auth/reset-password */
router.post('/reset-password', authRateLimit, validate(resetPasswordRules), resetPassword);

export default router;
