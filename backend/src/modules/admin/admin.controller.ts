import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest, ListUsersQuery } from '../../types';
import { Level, Program, UserStatus } from '@prisma/client';

/** GET /api/v1/admin/dashboard */
export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const stats = await adminService.getDashboardStats(departmentId);
  sendSuccess(res, stats, 'Dashboard stats retrieved');
});

/** POST /api/v1/admin/users */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const file = (req as Request & { file?: Express.Multer.File }).file;
  const profilePhotoUrl = file ? `/api/v1/uploads/${file.filename}` : undefined;

  const result = await adminService.createUser(
    {
      ...(req.body as Omit<import('../../types').CreateUserDto, 'departmentId'>),
      departmentId,
      profilePhotoUrl,
    },
    sub
  );
  sendSuccess(res, result, `User created. ID: ${result.userId} sent to ${result.user.email}`, 201);
});

/** GET /api/v1/admin/users */
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const query: ListUsersQuery = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    level: req.query.level as Level | undefined,
    program: req.query.program as Program | undefined,
    status: req.query.status as UserStatus | undefined,
    search: req.query.search as string | undefined,
  };

  const result = await adminService.listUsers(departmentId, query);
  sendSuccess(res, result.users, 'Users retrieved', 200, result.meta);
});

/** GET /api/v1/admin/users/:id */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const user = await adminService.getUserById(req.params.id, departmentId);
  sendSuccess(res, user, 'User retrieved');
});

/** PATCH /api/v1/admin/users/:id */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const file = (req as Request & { file?: Express.Multer.File }).file;
  const profilePhotoUrl = file ? `/api/v1/uploads/${file.filename}` : undefined;

  const body = req.body as Parameters<typeof adminService.updateUser>[2];
  const user = await adminService.updateUser(
    req.params.id,
    departmentId,
    { ...body, ...(profilePhotoUrl ? { profilePhotoUrl } : {}) },
    sub
  );
  sendSuccess(res, user, 'User updated');
});

/** GET /api/v1/admin/settings/department */
export const getDepartmentSettings = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const settings = await adminService.getDepartmentSettings(departmentId);
  sendSuccess(res, settings, 'Department settings retrieved');
});

/** PATCH /api/v1/admin/settings/department */
export const updateDepartmentSettings = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const settings = await adminService.updateDepartmentSettings(departmentId, {
    currentSession: req.body.currentSession as string | undefined,
    currentSemester: req.body.currentSemester as 'first' | 'second' | undefined,
  });
  sendSuccess(res, settings, 'Department settings updated');
});
