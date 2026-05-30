import { Request, Response } from 'express';
import { revenueService } from './revenue.service';
import { sendSuccess, asyncHandler } from '../../utils/response';
import type { RevenueQuery } from '../../types';

export const getRevenue = asyncHandler(async (req: Request, res: Response) => {
  const query: RevenueQuery = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    session: req.query.session as string | undefined,
    semester: req.query.semester as string | undefined,
    program: req.query.program as string | undefined,
    level: req.query.level as string | undefined,
    type: req.query.type as string | undefined,
  };
  const summary = await revenueService.getSummary(query);
  sendSuccess(res, summary, 'Revenue summary retrieved', 200, summary.meta);
});

export const exportRevenue = asyncHandler(async (req: Request, res: Response) => {
  const query: RevenueQuery = {
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    session: req.query.session as string | undefined,
    type: req.query.type as string | undefined,
  };
  const csv = await revenueService.exportCsv(query);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="revenue.csv"');
  res.send(csv);
});
