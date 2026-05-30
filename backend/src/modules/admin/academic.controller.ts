import { Request, Response } from 'express';
import { academicService } from './academic.service';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest } from '../../types';

export const previewAdvance = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const preview = await academicService.preview(departmentId);
  sendSuccess(res, preview, 'Advance preview generated');
});

export const advanceSemester = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const { type, confirm, force } = req.body as { type: 'semester' | 'session'; confirm: boolean; force?: boolean };
  const result = await academicService.advance(departmentId, type, confirm, force ?? false, sub);
  sendSuccess(res, result, 'Academic calendar advanced', 201);
});

export const listTransitions = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const list = await academicService.listTransitions(departmentId);
  sendSuccess(res, list, 'Academic transitions retrieved');
});
