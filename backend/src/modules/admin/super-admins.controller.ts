import { Request, Response } from 'express';
import { superAdminsService } from './super-admins.service';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest } from '../../types';
import { SuperAdminType } from '@prisma/client';

export const listSuperAdmins = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const list = await superAdminsService.listSuperAdmins(departmentId);
  sendSuccess(res, list, 'Super admins retrieved');
});

export const assignSuperAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const { userId, superAdminType } = req.body as { userId: string; superAdminType: SuperAdminType };
  const user = await superAdminsService.assignSuperAdmin(userId, superAdminType, sub, departmentId);
  sendSuccess(res, user, 'Super admin role assigned', 201);
});

export const revokeSuperAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const user = await superAdminsService.revokeSuperAdmin(req.params.id, sub, departmentId);
  sendSuccess(res, user, 'Super admin role revoked');
});
