import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { AuthRequest, JwtPayload } from '../types';
import { UserRole } from '@prisma/client';

/**
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches decoded payload to req.user.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 401, 'AUTH_TOKEN_MISSING', 'Authentication token required');
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    (req as AuthRequest).user = payload;
    next();
  } catch {
    sendError(res, 401, 'AUTH_TOKEN_EXPIRED', 'Token is invalid or expired');
  }
}

/**
 * Factory: requires the authenticated user to have one of the given roles.
 * Must be used after `authenticate`.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user as JwtPayload | undefined;

    if (!user) {
      sendError(res, 401, 'AUTH_TOKEN_MISSING', 'Authentication required');
      return;
    }

    if (!roles.includes(user.role)) {
      sendError(
        res,
        403,
        'AUTH_FORBIDDEN',
        `Access denied. Required role: ${roles.join(' or ')}`
      );
      return;
    }

    next();
  };
}

/** Shorthand guards */
export const requireAdmin = requireRole(UserRole.admin, UserRole.super_admin);
export const requireSuperAdmin = requireRole(UserRole.super_admin);
export const requireStudent = requireRole(UserRole.student);
