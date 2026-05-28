import { Request, Response } from 'express';
import { registrationService } from './registration.service';
import { uploadToS3 } from '../../utils/s3';
import { sendSuccess, asyncHandler, AppError } from '../../utils/response';
import { AuthRequest } from '../../types';
import multer from 'multer';

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/** GET /api/v1/registration */
export const listRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const { sub } = (req as AuthRequest).user;
  const regs = await registrationService.listRegistrations(sub);
  sendSuccess(res, regs, 'Registrations retrieved');
});

/** POST /api/v1/registration */
export const submitRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { sub } = (req as AuthRequest).user;
  const { session, semester } = req.body as { session: string; semester: string };

  if (!req.file) {
    res.status(400).json({ success: false, error: { code: 'FILE_MISSING', message: 'Course form file is required' } });
    return;
  }

  let fileUrl: string;
  try {
    fileUrl = await uploadToS3(req.file, 'course-registrations');
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message: string };
    res.status(e.statusCode ?? 500).json({ success: false, error: { code: e.code ?? 'UPLOAD_ERROR', message: e.message } });
    return;
  }

  const reg = await registrationService.submitRegistration(sub, session, semester, fileUrl);
  sendSuccess(res, reg, 'Course registration form submitted', 201);
});

/** GET /api/v1/registration/admin */
export const listAllRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const { status, session, semester } = req.query as Record<string, string>;
  const regs = await registrationService.listAllForAdmin(departmentId, { status, session, semester });
  sendSuccess(res, regs, 'Registrations retrieved');
});

/** PATCH /api/v1/registration/admin/:id/review */
export const reviewRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const { status, reviewNote } = req.body as { status: 'verified' | 'rejected'; reviewNote?: string };
  const reg = await registrationService.reviewRegistration(req.params.id, departmentId, sub, status, reviewNote ?? null);
  sendSuccess(res, reg, `Registration ${status}`);
});
