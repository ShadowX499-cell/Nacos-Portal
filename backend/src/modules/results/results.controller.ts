import { Request, Response } from 'express';
import { resultsService } from './results.service';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest } from '../../types';

/** GET /api/v1/results */
export const listResults = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;

  // Fetch full user to get their level
  const { prisma } = await import('../../config/prisma');
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'User not found' } });
    return;
  }

  const results = await resultsService.listResults(sub, departmentId, user.level);
  sendSuccess(res, results, 'Results retrieved');
});

/** GET /api/v1/results/gpa — must be registered BEFORE /:gradebookId */
export const getGpa = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;

  const { prisma } = await import('../../config/prisma');
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'User not found' } });
    return;
  }

  const gpa = await resultsService.getGpa(sub, departmentId, user.level);
  sendSuccess(res, gpa, 'GPA retrieved');
});

/** GET /api/v1/results/:gradebookId */
export const getResult = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const result = await resultsService.getResult(req.params.gradebookId, sub, departmentId);
  sendSuccess(res, result, 'Result retrieved');
});
