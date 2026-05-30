import { Request, Response, NextFunction } from 'express';
import { SuperAdminType, UserRole } from '@prisma/client';
import { sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { prisma } from '../config/prisma';

// ── Permission definitions ────────────────────────────────────────────────────

export type Permission =
  | 'publish_results'
  | 'approve_registrations'
  | 'manage_elections'
  | 'advance_semester'
  | 'view_revenue'
  | 'manage_super_admins'
  | 'view_all_audit_logs'
  | 'view_own_audit_log'
  | 'manage_exam_attendance';

type RoleKey = 'admin' | 'course_adviser' | 'result_exam_officer' | 'hod';

const PERMISSION_MAP: Record<RoleKey, Permission[]> = {
  admin: ['manage_exam_attendance', 'view_own_audit_log'],
  course_adviser: ['approve_registrations', 'view_own_audit_log'],
  result_exam_officer: ['publish_results', 'manage_exam_attendance', 'view_own_audit_log'],
  hod: [
    'publish_results',
    'approve_registrations',
    'manage_elections',
    'advance_semester',
    'view_revenue',
    'manage_super_admins',
    'view_all_audit_logs',
    'view_own_audit_log',
    'manage_exam_attendance',
  ],
};

function getRoleKey(role: UserRole, superAdminType?: SuperAdminType | null): RoleKey {
  if (role === UserRole.super_admin && superAdminType) {
    return superAdminType as RoleKey;
  }
  return 'admin';
}

/** Middleware factory: requires the authenticated user to have the given permission. */
export function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as AuthRequest).user;

    if (!user) {
      sendError(res, 401, 'AUTH_TOKEN_MISSING', 'Authentication required');
      return;
    }

    // Students never have admin permissions
    if (user.role === UserRole.student) {
      sendError(res, 403, 'FORBIDDEN_ROLE', 'Access denied');
      return;
    }

    const roleKey = getRoleKey(user.role, user.superAdminType as SuperAdminType | null);
    const allowed = PERMISSION_MAP[roleKey] ?? [];

    if (!allowed.includes(permission)) {
      // Log the failed attempt (fire-and-forget)
      prisma.auditLog.create({
        data: {
          actorId: user.sub,
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          entityType: 'permission',
          entityId: permission,
          newValue: { attemptedAction: permission, actorRole: roleKey },
          ipAddress: req.ip ?? null,
          userAgent: req.headers['user-agent'] ?? null,
        },
      }).catch(() => {});

      sendError(res, 403, 'FORBIDDEN_ROLE', `Access denied. Required permission: ${permission}`);
      return;
    }

    next();
  };
}

/** Shorthand guards for common permissions */
export const requireHod = requirePermission('manage_super_admins');
export const requirePublishResults = requirePermission('publish_results');
export const requireAdvanceSemester = requirePermission('advance_semester');
export const requireViewRevenue = requirePermission('view_revenue');
