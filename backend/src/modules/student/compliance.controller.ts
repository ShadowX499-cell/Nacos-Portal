import { Request, Response } from 'express';
import { complianceService } from './compliance.service';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest } from '../../types';

export const getCompliance = asyncHandler(async (req: Request, res: Response) => {
  const { sub } = (req as AuthRequest).user;
  const summary = await complianceService.getSummary(sub);
  sendSuccess(res, summary, 'Compliance summary retrieved');
});
