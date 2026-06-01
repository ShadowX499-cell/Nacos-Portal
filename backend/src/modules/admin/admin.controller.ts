import { Request, Response } from 'express';
import { PassThrough } from 'stream';
import PDFDocument from 'pdfkit';
import { adminService } from './admin.service';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest, ListUsersQuery } from '../../types';
import { Level, Program, UserStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';

// ── Shared PDF layout constants ──────────────────────────────────────────────
const GREEN   = '#166534';
const LGREEN  = '#dcfce7';
const GRAY    = '#6b7280';
const BLACK   = '#111827';
const WHITE   = '#ffffff';
const ROW_ALT = '#f0fdf4';
const PAGE_W  = 620;

const COLS = {
  no:       { x: 40,  w: 30  },
  userId:   { x: 70,  w: 140 },
  name:     { x: 210, w: 140 },
  program:  { x: 350, w: 55  },
  level:    { x: 405, w: 55  },
  password: { x: 460, w: 110 },
};
const ROW_H = 16;

function drawHeader(doc: PDFKit.PDFDocument, total: number, pageNum: { n: number }) {
  pageNum.n++;
  doc.rect(0, 0, doc.page.width, 50).fill(GREEN);
  doc.fillColor(WHITE).fontSize(14).font('Helvetica-Bold')
    .text('NACOS-AIFUE — Student Login Credentials', 40, 12, { lineBreak: false });
  doc.fontSize(8).font('Helvetica')
    .text(`Computer Science Department · ${total} accounts · Generated ${new Date().toLocaleDateString('en-NG')}`,
      40, 30, { lineBreak: false });
  doc.fillColor('#a7f3d0').fontSize(7)
    .text(`Page ${pageNum.n}`, doc.page.width - 80, 20, { lineBreak: false });
}

function drawColHeader(doc: PDFKit.PDFDocument, y: number) {
  doc.rect(40, y, PAGE_W - 40, ROW_H).fill(GREEN);
  doc.fillColor(WHITE).fontSize(7).font('Helvetica-Bold');
  const headers: [keyof typeof COLS, string][] = [
    ['no', '#'], ['userId', 'Student ID'], ['name', 'Full Name'],
    ['program', 'Program'], ['level', 'Level'], ['password', 'Password'],
  ];
  for (const [k, label] of headers) {
    doc.text(label, COLS[k].x + 2, y + 4, { width: COLS[k].w - 4, lineBreak: false });
  }
  return y + ROW_H;
}

function drawRow(doc: PDFKit.PDFDocument, y: number, i: number,
  row: { userId: string; name: string; program: string; level: string; password: string }) {
  doc.rect(40, y, PAGE_W - 40, ROW_H).fill(i % 2 === 0 ? WHITE : ROW_ALT);
  doc.fillColor(GRAY).fontSize(6.5).font('Helvetica');
  doc.text(String(i + 1), COLS.no.x + 2, y + 4, { width: COLS.no.w - 4, lineBreak: false });
  doc.fillColor(BLACK).font('Courier').fontSize(6.5);
  doc.text(row.userId, COLS.userId.x + 2, y + 4, { width: COLS.userId.w - 4, lineBreak: false });
  doc.font('Helvetica').fillColor(BLACK);
  doc.text(row.name, COLS.name.x + 2, y + 4, { width: COLS.name.w - 4, lineBreak: false });
  doc.fillColor(GRAY);
  doc.text(row.program, COLS.program.x + 2, y + 4, { width: COLS.program.w - 4, lineBreak: false });
  doc.text(row.level.replace('L', '') + 'L', COLS.level.x + 2, y + 4, { width: COLS.level.w - 4, lineBreak: false });
  doc.fillColor(GREEN).font('Courier-Bold').fontSize(6.5);
  doc.text(row.password, COLS.password.x + 2, y + 4, { width: COLS.password.w - 4, lineBreak: false });
  return y + ROW_H;
}

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

/** GET /api/v1/admin/users/:id/profile */
export const getStudentProfile = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const profile = await adminService.getStudentProfile(req.params.id, departmentId);
  sendSuccess(res, profile, 'Student profile retrieved');
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

/** GET /api/v1/admin/export/student-logins.pdf */
export const exportStudentLoginsPdf = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;

  const students = await prisma.user.findMany({
    where: { departmentId, role: 'student' },
    select: { userId: true, name: true, program: true, level: true },
    orderBy: [{ program: 'asc' }, { level: 'asc' }, { name: 'asc' }],
  });

  const rows = students.map((s) => ({
    userId:   s.userId,
    name:     s.name,
    program:  s.program as string,
    level:    s.level as string,
    password: `Nacos@${s.userId.split('/').pop()}`,
  }));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="student-logins.pdf"');

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
  const pass = new PassThrough();
  doc.pipe(pass);
  pass.pipe(res);

  const pageNum = { n: 0 };
  drawHeader(doc, rows.length, pageNum);

  let y = 60;
  const BOTTOM = doc.page.height - 40;
  let currentGroup = '';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const group = `${row.program} — ${row.level.replace('L', '')} Level`;

    if (y + ROW_H > BOTTOM) {
      doc.addPage();
      drawHeader(doc, rows.length, pageNum);
      y = 60;
      currentGroup = '';
      y = drawColHeader(doc, y);
    }

    if (group !== currentGroup) {
      if (currentGroup !== '') y += 4;
      doc.rect(40, y, PAGE_W - 40, 14).fill(LGREEN);
      doc.fillColor(GREEN).fontSize(7.5).font('Helvetica-Bold')
        .text(group, 44, y + 3, { lineBreak: false });
      y += 14;
      currentGroup = group;
      y = drawColHeader(doc, y);
    }

    y = drawRow(doc, y, i, row);
  }

  y += 10;
  doc.rect(40, y, PAGE_W - 40, 22).fill('#fefce8');
  doc.fillColor('#92400e').fontSize(7).font('Helvetica-Bold')
    .text('⚠  CONFIDENTIAL — Password: Nacos@<5-digit-ID-suffix>  |  Distribute securely  |  Students must change password on first login.',
      44, y + 7, { width: PAGE_W - 48, lineBreak: false });

  doc.end();
});
