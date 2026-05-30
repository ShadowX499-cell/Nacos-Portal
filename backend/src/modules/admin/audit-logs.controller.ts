import { Request, Response } from 'express';
import { auditLogsService } from './audit-logs.service';
import { sendSuccess, sendError, asyncHandler } from '../../utils/response';
import { AuthRequest, ListAuditLogsQuery } from '../../types';

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const query: ListAuditLogsQuery = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    actorId: req.query.actorId as string | undefined,
    action: req.query.action as string | undefined,
    entityType: req.query.entityType as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  };
  const result = await auditLogsService.listLogs(query);
  sendSuccess(res, result.logs, 'Audit logs retrieved', 200, result.meta);
});

export const listOwnAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { sub } = (req as AuthRequest).user;
  const query: ListAuditLogsQuery = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  };
  const result = await auditLogsService.listLogs(query, sub);
  sendSuccess(res, result.logs, 'Your audit trail retrieved', 200, result.meta);
});

export const getAuditLogById = asyncHandler(async (req: Request, res: Response) => {
  const log = await auditLogsService.getLogById(req.params.id);
  if (!log) {
    sendError(res, 404, 'RESOURCE_NOT_FOUND', 'Audit log entry not found');
    return;
  }
  sendSuccess(res, log, 'Audit log entry retrieved');
});
