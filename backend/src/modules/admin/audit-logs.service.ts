import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import type { AuditLogPublic, ListAuditLogsQuery, PaginationMeta } from '../../types';

export class AuditLogsService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async listLogs(
    query: ListAuditLogsQuery,
    actorIdFilter?: string  // when set, only show logs for this actor (own trail)
  ): Promise<{ logs: AuditLogPublic[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: import('@prisma/client').Prisma.AuditLogWhereInput = {
      ...(actorIdFilter ? { actorId: actorIdFilter } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' as const } } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.dateFrom || query.dateTo ? {
        createdAt: {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
        },
      } : {}),
    };

    const [logs, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        include: { actor: { select: { name: true, userId: true, role: true, superAdminType: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((l) => ({
        id: l.id,
        actorId: l.actorId,
        actorName: l.actor.name,
        actorUserId: l.actor.userId,
        actorRole: l.actor.superAdminType ?? l.actor.role,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        oldValue: l.oldValue,
        newValue: l.newValue,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getLogById(id: string): Promise<AuditLogPublic | null> {
    const l = await this.db.auditLog.findUnique({
      where: { id },
      include: { actor: { select: { name: true, userId: true, role: true, superAdminType: true } } },
    });
    if (!l) return null;
    return {
      id: l.id, actorId: l.actorId, actorName: l.actor.name, actorUserId: l.actor.userId,
      actorRole: l.actor.superAdminType ?? l.actor.role, action: l.action,
      entityType: l.entityType, entityId: l.entityId,
      oldValue: l.oldValue, newValue: l.newValue,
      ipAddress: l.ipAddress, createdAt: l.createdAt,
    };
  }
}

export const auditLogsService = new AuditLogsService();
