import { PrismaClient, UserRole, SuperAdminType } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import { AppError } from '../../utils/response';
import type { UserPublic } from '../../types';

export class SuperAdminsService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async listSuperAdmins(departmentId: string): Promise<UserPublic[]> {
    const users = await this.db.user.findMany({
      where: { departmentId, role: UserRole.super_admin },
      orderBy: { createdAt: 'asc' },
    });
    return users.map(this.toPublic);
  }

  async assignSuperAdmin(
    targetUserId: string,
    superAdminType: SuperAdminType,
    actorId: string,
    departmentId: string
  ): Promise<UserPublic> {
    const target = await this.db.user.findFirst({
      where: { id: targetUserId, departmentId },
    });
    if (!target) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'User not found');
    if (target.role === UserRole.student) {
      throw new AppError(400, 'INVALID_OPERATION', 'Cannot assign super admin role to a student');
    }

    const updated = await this.db.user.update({
      where: { id: targetUserId },
      data: { role: UserRole.super_admin, superAdminType },
    });

    this.db.auditLog.create({
      data: {
        actorId,
        action: 'SUPER_ADMIN_CREATED',
        entityType: 'user',
        entityId: targetUserId,
        newValue: { superAdminType, targetUserId } as import('@prisma/client').Prisma.InputJsonValue,
      },
    }).catch(() => {});

    return this.toPublic(updated);
  }

  async revokeSuperAdmin(
    targetUserId: string,
    actorId: string,
    departmentId: string
  ): Promise<UserPublic> {
    const target = await this.db.user.findFirst({
      where: { id: targetUserId, departmentId, role: UserRole.super_admin },
    });
    if (!target) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Super admin not found');

    const updated = await this.db.user.update({
      where: { id: targetUserId },
      data: { role: UserRole.admin, superAdminType: null },
    });

    this.db.auditLog.create({
      data: {
        actorId,
        action: 'SUPER_ADMIN_REVOKED',
        entityType: 'user',
        entityId: targetUserId,
        oldValue: { superAdminType: target.superAdminType } as import('@prisma/client').Prisma.InputJsonValue,
      },
    }).catch(() => {});

    return this.toPublic(updated);
  }

  private toPublic(user: Parameters<typeof import('@prisma/client').Prisma.validator>[0] & {
    id: string; userId: string; name: string; email: string; phone: string | null;
    program: UserPublic['program']; level: UserPublic['level']; role: UserPublic['role'];
    status: UserPublic['status']; studentStatus: UserPublic['studentStatus'];
    superAdminType: UserPublic['superAdminType'];
    profilePhotoUrl?: string | null; dateOfBirth?: Date | null;
    stateOfOrigin?: string | null; lga?: string | null; homeAddress?: string | null;
    departmentId: string; createdAt: Date; updatedAt: Date;
  }): UserPublic {
    return {
      id: user.id, userId: user.userId, name: user.name, email: user.email,
      phone: user.phone, program: user.program, level: user.level, role: user.role,
      status: user.status, studentStatus: user.studentStatus,
      superAdminType: user.superAdminType ?? null,
      profilePhotoUrl: user.profilePhotoUrl ?? null,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : null,
      stateOfOrigin: user.stateOfOrigin ?? null, lga: user.lga ?? null,
      homeAddress: user.homeAddress ?? null, departmentId: user.departmentId,
      createdAt: user.createdAt, updatedAt: user.updatedAt,
    };
  }
}

export const superAdminsService = new SuperAdminsService();
