import { Request, Response } from 'express';
import { paymentStatusService, PaymentStatusQuery } from './payment-status.service';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest } from '../../types';

function parseQuery(req: Request): PaymentStatusQuery {
  return {
    program:  req.query.program  as string | undefined,
    level:    req.query.level    as string | undefined,
    session:  req.query.session  as string | undefined,
    semester: req.query.semester as string | undefined,
    status:   req.query.status   as 'paid' | 'unpaid' | 'all' | undefined,
    page:     req.query.page  ? Number(req.query.page)  : undefined,
    limit:    req.query.limit ? Number(req.query.limit) : undefined,
  };
}

/** GET /api/v1/admin/payments/nacos-dues/students */
export const getNacosStudents = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const result = await paymentStatusService.getNacosStudents(departmentId, parseQuery(req));
  sendSuccess(res, result.data, 'NACOS dues student list retrieved', 200, result.meta);
});

/** GET /api/v1/admin/payments/nacos-dues/students/export.pdf */
export const exportNacosPdf = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const stream = await paymentStatusService.exportNacosPdf(departmentId, parseQuery(req));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="nacos-dues-status.pdf"');
  stream.pipe(res);
});

/** GET /api/v1/admin/payments/result-sub/students */
export const getResultSubStudents = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const result = await paymentStatusService.getResultSubStudents(departmentId, parseQuery(req));
  sendSuccess(res, result.data, 'Result sub student list retrieved', 200, result.meta);
});

/** GET /api/v1/admin/payments/result-sub/students/export.pdf */
export const exportResultSubPdf = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const stream = await paymentStatusService.exportResultSubPdf(departmentId, parseQuery(req));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="result-sub-status.pdf"');
  stream.pipe(res);
});
