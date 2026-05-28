import { Request, Response } from 'express';
import { authService } from './auth.service';
import { sendSuccess, asyncHandler } from '../../utils/response';

const REFRESH_COOKIE_NAME = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

/** POST /api/v1/auth/validate */
export const validateAccount = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.validateAccount(req.body);
  sendSuccess(res, result, result.message, 200);
});

/** POST /api/v1/auth/login */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);

  // Set refresh token as HttpOnly cookie
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);

  sendSuccess(
    res,
    { accessToken: result.accessToken, user: result.user },
    'Login successful',
    200
  );
});

/** POST /api/v1/auth/refresh */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  // Accept from cookie OR body (for API clients without cookie support)
  const refreshToken: string =
    (req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined) ??
    (req.body?.refreshToken as string | undefined) ??
    '';

  const result = await authService.refreshToken(refreshToken);
  sendSuccess(res, result, 'Token refreshed', 200);
});

/** POST /api/v1/auth/logout */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken: string =
    (req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined) ??
    (req.body?.refreshToken as string | undefined) ??
    '';

  await authService.logout(refreshToken);

  res.clearCookie(REFRESH_COOKIE_NAME);
  sendSuccess(res, {}, 'Logged out successfully', 200);
});

/** POST /api/v1/auth/forgot-password */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body);
  sendSuccess(res, {}, result.message, 200);
});

/** POST /api/v1/auth/reset-password */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.resetPassword(req.body);
  sendSuccess(res, {}, result.message, 200);
});

/** GET /api/v1/auth/me */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const { sub } = (req as import('../../types').AuthRequest).user;
  const user = await authService.getMe(sub);
  sendSuccess(res, user, 'Profile retrieved');
});
