# Payment Status Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add paid/unpaid payment compliance widgets to the admin dashboard and two full-page detail views (NACOS Dues, Result Subscription) with PDF export.

**Architecture:** Backend extends `getDashboardStats` with two payment stat counts using Prisma's `some`/`none` relation filters. A new `PaymentStatusService` handles paginated student lists with payment status, plus PDF generation via PDFKit. Frontend adds a `PaymentDonut` component and a new full-width card on the dashboard, plus two new page components.

**Tech Stack:** Node.js 20 / Express 4 / Prisma 5 / PDFKit (backend); React 18 / Vite 5 / Tailwind CSS 3 / React Router v6 (frontend).

---

## Task 1: Backend — extend getDashboardStats with payment stats

**Files:**
- Modify: `backend/src/modules/admin/admin.service.ts`

- [ ] **Step 1: Add department fetch before the Promise.all**

In `getDashboardStats`, before the existing `const [` destructuring (around line 255), add:

```typescript
const dept = await this.db.department.findUnique({
  where: { id: departmentId },
  select: { currentSession: true, currentSemester: true },
});
const currentSession  = dept?.currentSession  ?? null;
const currentSemester = dept?.currentSemester ?? null;
```

- [ ] **Step 2: Add two payment count queries to the Promise.all**

Inside the existing `Promise.all([...])`, append two new items at the end of the array (after `successPayments`):

```typescript
// nacosPaymentPaid — count of students who paid nacos_dues for currentSession
currentSession
  ? this.db.payment.count({
      where: {
        type: 'nacos_dues',
        status: 'success',
        sessionYear: currentSession,
        user: { departmentId },
      },
    })
  : Promise.resolve(0),

// resultSubPaid — count of students who paid result_subscription for currentSession+currentSemester
currentSession && currentSemester
  ? this.db.payment.count({
      where: {
        type: 'result_subscription',
        status: 'success',
        sessionYear: currentSession,
        semester: currentSemester,
        user: { departmentId },
      },
    })
  : Promise.resolve(0),
```

- [ ] **Step 3: Destructure the two new values**

Update the destructuring line from:
```typescript
const [
  totalStudents,
  ...
  successPayments,
] = await Promise.all([
```
to:
```typescript
const [
  totalStudents,
  pendingValidations,
  activeElections,
  unpublishedResults,
  revenueResult,
  publishedGradebooks,
  todayAttendanceSessions,
  draftGradebooksWithCourses,
  recentUsers,
  recentPayments,
  recentGradebooks,
  levelCounts,
  programCounts,
  successPayments,
  nacosPaymentPaid,
  resultSubPaid,
] = await Promise.all([
```

- [ ] **Step 4: Update the return type signature**

Change the `getDashboardStats` return type to add two new fields:

```typescript
async getDashboardStats(departmentId: string): Promise<{
  totalStudents: number;
  pendingValidations: number;
  activeElections: number;
  unpublishedResults: number;
  totalRevenue: number;
  publishedGradebooks: number;
  todayAttendanceSessions: number;
  draftGradebooksReady: number;
  monthlyRevenue: { month: string; total: number }[];
  studentsByLevel: { level: string; count: number }[];
  studentsByProgram: { program: string; count: number }[];
  recentActivity: {
    type: 'registered' | 'activated' | 'payment' | 'result_published';
    label: string;
    time: string;
  }[];
  nacosPaymentStats: { paid: number; unpaid: number; session: string };
  resultSubStats: { paid: number; unpaid: number; session: string; semester: string };
}>
```

- [ ] **Step 5: Add the two new fields to the return statement**

In the `return {` block (around line 366), add after `recentActivity: activities,`:

```typescript
nacosPaymentStats: {
  paid:    nacosPaymentPaid,
  unpaid:  totalStudents - nacosPaymentPaid,
  session: currentSession ?? '—',
},
resultSubStats: {
  paid:     resultSubPaid,
  unpaid:   totalStudents - resultSubPaid,
  session:  currentSession ?? '—',
  semester: currentSemester ?? '—',
},
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/admin/admin.service.ts
git commit -m "feat(dashboard): add payment compliance stats to getDashboardStats"
```

---

## Task 2: Backend — PaymentStatusService

**Files:**
- Create: `backend/src/modules/admin/payment-status.service.ts`

- [ ] **Step 1: Create the service file**

Create `backend/src/modules/admin/payment-status.service.ts`:

```typescript
import { PrismaClient, PaymentType, PaymentStatus, Semester, UserRole, Program, Level } from '@prisma/client';
import { PassThrough } from 'stream';
import PDFDocument from 'pdfkit';
import { prisma as defaultPrisma } from '../../config/prisma';
import type { PaginationMeta } from '../../types';

export interface PaymentStatusStudent {
  id: string;
  userId: string;
  name: string;
  program: string;
  level: string;
  hasPaid: boolean;
  paidAt: string | null;
  amount: number | null;
  reference: string | null;
  semester: string | null;
}

export interface PaymentStatusQuery {
  program?: string;
  level?: string;
  session?: string;
  semester?: string;
  status?: 'paid' | 'unpaid' | 'all';
  page?: number;
  limit?: number;
}

const GREEN   = '#166534';
const LGREEN  = '#dcfce7';
const GRAY    = '#6b7280';
const BLACK   = '#111827';
const WHITE   = '#ffffff';
const ROW_ALT = '#f0fdf4';
const PAGE_W  = 620;
const ROW_H   = 16;

export class PaymentStatusService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  // ── NACOS Dues ──────────────────────────────────────────────────────────────

  async getNacosStudents(
    departmentId: string,
    query: PaymentStatusQuery
  ): Promise<{ data: PaymentStatusStudent[]; meta: PaginationMeta }> {
    const page  = query.page  ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip  = (page - 1) * limit;

    const paymentWhere = {
      type:        PaymentType.nacos_dues,
      status:      PaymentStatus.success,
      sessionYear: query.session ?? undefined,
    };

    const studentWhere = {
      departmentId,
      role:     UserRole.student,
      ...(query.program ? { program: query.program as Program } : {}),
      ...(query.level   ? { level:   query.level   as Level   } : {}),
      ...(query.status === 'paid'   ? { payments: { some: paymentWhere } } : {}),
      ...(query.status === 'unpaid' ? { payments: { none: paymentWhere } } : {}),
    };

    const [total, students] = await Promise.all([
      this.db.user.count({ where: studentWhere }),
      this.db.user.findMany({
        where: studentWhere,
        include: {
          payments: {
            where: paymentWhere,
            select: { paidAt: true, amount: true, reference: true },
            take: 1,
          },
        },
        orderBy: [{ program: 'asc' }, { level: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    const data: PaymentStatusStudent[] = students.map((s) => {
      const p = s.payments[0] ?? null;
      return {
        id:        s.id,
        userId:    s.userId,
        name:      s.name,
        program:   s.program as string,
        level:     s.level   as string,
        hasPaid:   !!p,
        paidAt:    p?.paidAt   ? p.paidAt.toISOString()  : null,
        amount:    p?.amount   ? Number(p.amount)         : null,
        reference: p?.reference ?? null,
        semester:  null,
      };
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Result Subscription ─────────────────────────────────────────────────────

  async getResultSubStudents(
    departmentId: string,
    query: PaymentStatusQuery
  ): Promise<{ data: PaymentStatusStudent[]; meta: PaginationMeta }> {
    const page  = query.page  ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip  = (page - 1) * limit;

    const paymentWhere = {
      type:        PaymentType.result_subscription,
      status:      PaymentStatus.success,
      sessionYear: query.session  ?? undefined,
      semester:    query.semester ? (query.semester as Semester) : undefined,
    };

    const studentWhere = {
      departmentId,
      role:     UserRole.student,
      ...(query.program ? { program: query.program as Program } : {}),
      ...(query.level   ? { level:   query.level   as Level   } : {}),
      ...(query.status === 'paid'   ? { payments: { some: paymentWhere } } : {}),
      ...(query.status === 'unpaid' ? { payments: { none: paymentWhere } } : {}),
    };

    const [total, students] = await Promise.all([
      this.db.user.count({ where: studentWhere }),
      this.db.user.findMany({
        where: studentWhere,
        include: {
          payments: {
            where: paymentWhere,
            select: { paidAt: true, amount: true, reference: true, semester: true },
            take: 1,
          },
        },
        orderBy: [{ program: 'asc' }, { level: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    const data: PaymentStatusStudent[] = students.map((s) => {
      const p = s.payments[0] ?? null;
      return {
        id:        s.id,
        userId:    s.userId,
        name:      s.name,
        program:   s.program  as string,
        level:     s.level    as string,
        hasPaid:   !!p,
        paidAt:    p?.paidAt  ? p.paidAt.toISOString()  : null,
        amount:    p?.amount  ? Number(p.amount)         : null,
        reference: p?.reference ?? null,
        semester:  p?.semester  ?? (query.semester ?? null),
      };
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── PDF export — NACOS Dues ──────────────────────────────────────────────────

  async exportNacosPdf(
    departmentId: string,
    query: PaymentStatusQuery
  ): Promise<NodeJS.ReadableStream> {
    const { data } = await this.getNacosStudents(departmentId, { ...query, page: 1, limit: 10000 });

    const COLS_NACOS = {
      no:      { x: 40,  w: 25  },
      userId:  { x: 65,  w: 145 },
      name:    { x: 210, w: 150 },
      program: { x: 360, w: 55  },
      level:   { x: 415, w: 45  },
      status:  { x: 460, w: 65  },
      paidAt:  { x: 525, w: 80  },
    };

    const doc  = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    const pass = new PassThrough();
    doc.pipe(pass);

    const title  = 'NACOS Dues — Payment Status';
    const filter = query.status === 'paid' ? 'Paid only' : query.status === 'unpaid' ? 'Unpaid only' : 'All students';
    let pageNum  = 0;

    const drawHeader = () => {
      pageNum++;
      doc.rect(0, 0, doc.page.width, 50).fill(GREEN);
      doc.fillColor(WHITE).fontSize(13).font('Helvetica-Bold')
        .text(title, 40, 12, { lineBreak: false });
      doc.fontSize(8).font('Helvetica')
        .text(`${data.length} students · Session: ${query.session ?? '—'} · ${filter} · Generated ${new Date().toLocaleDateString('en-NG')}`,
          40, 30, { lineBreak: false });
      doc.fillColor('#a7f3d0').fontSize(7)
        .text(`Page ${pageNum}`, doc.page.width - 80, 20, { lineBreak: false });
    };

    const drawColHeader = (y: number) => {
      doc.rect(40, y, PAGE_W - 40, ROW_H).fill(GREEN);
      doc.fillColor(WHITE).fontSize(7).font('Helvetica-Bold');
      const headers: [keyof typeof COLS_NACOS, string][] = [
        ['no', '#'], ['userId', 'Student ID'], ['name', 'Full Name'],
        ['program', 'Program'], ['level', 'Level'], ['status', 'Status'], ['paidAt', 'Paid Date'],
      ];
      for (const [k, label] of headers) {
        doc.text(label, COLS_NACOS[k].x + 2, y + 4, { width: COLS_NACOS[k].w - 4, lineBreak: false });
      }
      return y + ROW_H;
    };

    drawHeader();
    let y = 60;
    const BOTTOM = doc.page.height - 40;
    y = drawColHeader(y);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (y + ROW_H > BOTTOM) {
        doc.addPage();
        drawHeader();
        y = 60;
        y = drawColHeader(y);
      }
      doc.rect(40, y, PAGE_W - 40, ROW_H).fill(i % 2 === 0 ? WHITE : ROW_ALT);
      doc.fillColor(GRAY).fontSize(6.5).font('Helvetica');
      doc.text(String(i + 1), COLS_NACOS.no.x + 2, y + 4, { width: COLS_NACOS.no.w - 4, lineBreak: false });
      doc.fillColor(BLACK).font('Courier').fontSize(6.5);
      doc.text(row.userId, COLS_NACOS.userId.x + 2, y + 4, { width: COLS_NACOS.userId.w - 4, lineBreak: false });
      doc.font('Helvetica').fillColor(BLACK);
      doc.text(row.name, COLS_NACOS.name.x + 2, y + 4, { width: COLS_NACOS.name.w - 4, lineBreak: false });
      doc.fillColor(GRAY);
      doc.text(row.program, COLS_NACOS.program.x + 2, y + 4, { width: COLS_NACOS.program.w - 4, lineBreak: false });
      doc.text(row.level.replace('L', '') + 'L', COLS_NACOS.level.x + 2, y + 4, { width: COLS_NACOS.level.w - 4, lineBreak: false });
      doc.fillColor(row.hasPaid ? '#16a34a' : '#dc2626').font('Helvetica-Bold');
      doc.text(row.hasPaid ? 'PAID' : 'UNPAID', COLS_NACOS.status.x + 2, y + 4, { width: COLS_NACOS.status.w - 4, lineBreak: false });
      doc.fillColor(GRAY).font('Helvetica');
      doc.text(row.paidAt ? new Date(row.paidAt).toLocaleDateString('en-NG') : '—', COLS_NACOS.paidAt.x + 2, y + 4, { width: COLS_NACOS.paidAt.w - 4, lineBreak: false });
      y += ROW_H;
    }

    doc.end();
    return pass;
  }

  // ── PDF export — Result Subscription ──────────────────────────────────────────

  async exportResultSubPdf(
    departmentId: string,
    query: PaymentStatusQuery
  ): Promise<NodeJS.ReadableStream> {
    const { data } = await this.getResultSubStudents(departmentId, { ...query, page: 1, limit: 10000 });

    const COLS_RESULT = {
      no:       { x: 40,  w: 25  },
      userId:   { x: 65,  w: 135 },
      name:     { x: 200, w: 140 },
      program:  { x: 340, w: 50  },
      level:    { x: 390, w: 45  },
      semester: { x: 435, w: 55  },
      status:   { x: 490, w: 55  },
      paidAt:   { x: 545, w: 75  },
    };

    const doc  = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    const pass = new PassThrough();
    doc.pipe(pass);

    const title  = 'Result Subscription — Payment Status';
    const filter = query.status === 'paid' ? 'Paid only' : query.status === 'unpaid' ? 'Unpaid only' : 'All students';
    let pageNum  = 0;

    const drawHeader = () => {
      pageNum++;
      doc.rect(0, 0, doc.page.width, 50).fill(GREEN);
      doc.fillColor(WHITE).fontSize(13).font('Helvetica-Bold')
        .text(title, 40, 12, { lineBreak: false });
      doc.fontSize(8).font('Helvetica')
        .text(`${data.length} students · Session: ${query.session ?? '—'} · Semester: ${query.semester ?? 'all'} · ${filter} · Generated ${new Date().toLocaleDateString('en-NG')}`,
          40, 30, { lineBreak: false });
      doc.fillColor('#a7f3d0').fontSize(7)
        .text(`Page ${pageNum}`, doc.page.width - 80, 20, { lineBreak: false });
    };

    const drawColHeader = (y: number) => {
      doc.rect(40, y, PAGE_W - 40, ROW_H).fill(GREEN);
      doc.fillColor(WHITE).fontSize(7).font('Helvetica-Bold');
      const headers: [keyof typeof COLS_RESULT, string][] = [
        ['no', '#'], ['userId', 'Student ID'], ['name', 'Full Name'],
        ['program', 'Program'], ['level', 'Level'], ['semester', 'Semester'],
        ['status', 'Status'], ['paidAt', 'Paid Date'],
      ];
      for (const [k, label] of headers) {
        doc.text(label, COLS_RESULT[k].x + 2, y + 4, { width: COLS_RESULT[k].w - 4, lineBreak: false });
      }
      return y + ROW_H;
    };

    drawHeader();
    let y = 60;
    const BOTTOM = doc.page.height - 40;
    y = drawColHeader(y);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (y + ROW_H > BOTTOM) {
        doc.addPage();
        drawHeader();
        y = 60;
        y = drawColHeader(y);
      }
      doc.rect(40, y, PAGE_W - 40, ROW_H).fill(i % 2 === 0 ? WHITE : ROW_ALT);
      doc.fillColor(GRAY).fontSize(6.5).font('Helvetica');
      doc.text(String(i + 1), COLS_RESULT.no.x + 2, y + 4, { width: COLS_RESULT.no.w - 4, lineBreak: false });
      doc.fillColor(BLACK).font('Courier').fontSize(6.5);
      doc.text(row.userId, COLS_RESULT.userId.x + 2, y + 4, { width: COLS_RESULT.userId.w - 4, lineBreak: false });
      doc.font('Helvetica').fillColor(BLACK);
      doc.text(row.name, COLS_RESULT.name.x + 2, y + 4, { width: COLS_RESULT.name.w - 4, lineBreak: false });
      doc.fillColor(GRAY);
      doc.text(row.program, COLS_RESULT.program.x + 2, y + 4, { width: COLS_RESULT.program.w - 4, lineBreak: false });
      doc.text(row.level.replace('L', '') + 'L', COLS_RESULT.level.x + 2, y + 4, { width: COLS_RESULT.level.w - 4, lineBreak: false });
      doc.text(row.semester ? (row.semester.charAt(0).toUpperCase() + row.semester.slice(1)) : '—', COLS_RESULT.semester.x + 2, y + 4, { width: COLS_RESULT.semester.w - 4, lineBreak: false });
      doc.fillColor(row.hasPaid ? '#16a34a' : '#dc2626').font('Helvetica-Bold');
      doc.text(row.hasPaid ? 'PAID' : 'UNPAID', COLS_RESULT.status.x + 2, y + 4, { width: COLS_RESULT.status.w - 4, lineBreak: false });
      doc.fillColor(GRAY).font('Helvetica');
      doc.text(row.paidAt ? new Date(row.paidAt).toLocaleDateString('en-NG') : '—', COLS_RESULT.paidAt.x + 2, y + 4, { width: COLS_RESULT.paidAt.w - 4, lineBreak: false });
      y += ROW_H;
    }

    doc.end();
    return pass;
  }
}

export const paymentStatusService = new PaymentStatusService();
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/admin/payment-status.service.ts
git commit -m "feat(payments): add PaymentStatusService with student list and PDF export"
```

---

## Task 3: Backend — controller + routes

**Files:**
- Create: `backend/src/modules/admin/payment-status.controller.ts`
- Modify: `backend/src/modules/admin/admin.routes.ts`

- [ ] **Step 1: Create the controller**

Create `backend/src/modules/admin/payment-status.controller.ts`:

```typescript
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
```

- [ ] **Step 2: Add routes to admin.routes.ts**

In `backend/src/modules/admin/admin.routes.ts`, add the import at the top:

```typescript
import {
  getNacosStudents,
  exportNacosPdf,
  getResultSubStudents,
  exportResultSubPdf,
} from './payment-status.controller';
```

After the `GET /dashboard/activity` route (line 47), add:

```typescript
// ── Payment status ────────────────────────────────────────────────────────────

/** GET /api/v1/admin/payments/nacos-dues/students */
router.get('/payments/nacos-dues/students', getNacosStudents);

/** GET /api/v1/admin/payments/nacos-dues/students/export.pdf */
router.get('/payments/nacos-dues/students/export.pdf', exportNacosPdf);

/** GET /api/v1/admin/payments/result-sub/students */
router.get('/payments/result-sub/students', getResultSubStudents);

/** GET /api/v1/admin/payments/result-sub/students/export.pdf */
router.get('/payments/result-sub/students/export.pdf', exportResultSubPdf);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/admin/payment-status.controller.ts backend/src/modules/admin/admin.routes.ts
git commit -m "feat(payments): add payment status endpoints"
```

---

## Task 4: Frontend — update types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Extend DashboardStats**

In `frontend/src/types/index.ts`, find the `DashboardStats` interface (line 90) and add two new fields at the end of the interface:

```typescript
export interface DashboardStats {
  totalStudents: number;
  pendingValidations: number;
  activeElections: number;
  unpublishedResults: number;
  totalRevenue: number;
  publishedGradebooks: number;
  todayAttendanceSessions: number;
  draftGradebooksReady: number;
  monthlyRevenue: { month: string; total: number }[];
  studentsByLevel: { level: string; count: number }[];
  studentsByProgram: { program: string; count: number }[];
  recentActivity: {
    type: 'registered' | 'activated' | 'payment' | 'result_published';
    label: string;
    time: string;
  }[];
  nacosPaymentStats: { paid: number; unpaid: number; session: string };
  resultSubStats:    { paid: number; unpaid: number; session: string; semester: string };
}
```

- [ ] **Step 2: Add PaymentStatusStudent type**

After the `DashboardStats` interface, add:

```typescript
export interface PaymentStatusStudent {
  id: string;
  userId: string;
  name: string;
  program: string;
  level: string;
  hasPaid: boolean;
  paidAt: string | null;
  amount: number | null;
  reference: string | null;
  semester: string | null;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat(types): add payment status types to frontend"
```

---

## Task 5: Frontend — update api/client

**Files:**
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Add paymentStatusApi**

In `frontend/src/api/client.ts`, append at the end of the file:

```typescript
// ── Payment Status API ────────────────────────────────────────────────────────

export const paymentStatusApi = {
  getNacosStudents: (params?: Record<string, string | number>) =>
    api.get<{ success: true; data: import('../types').PaymentStatusStudent[]; meta: import('../types').PaginationMeta }>(
      '/admin/payments/nacos-dues/students',
      { params }
    ),

  getResultSubStudents: (params?: Record<string, string | number>) =>
    api.get<{ success: true; data: import('../types').PaymentStatusStudent[]; meta: import('../types').PaginationMeta }>(
      '/admin/payments/result-sub/students',
      { params }
    ),

  exportNacosPdf: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    window.open(`${api.defaults.baseURL}/admin/payments/nacos-dues/students/export.pdf${qs}`, '_blank');
  },

  exportResultSubPdf: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    window.open(`${api.defaults.baseURL}/admin/payments/result-sub/students/export.pdf${qs}`, '_blank');
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/client.ts
git commit -m "feat(api): add paymentStatusApi to client"
```

---

## Task 6: Frontend — AdminDashboard payment compliance card

**Files:**
- Modify: `frontend/src/pages/admin/AdminDashboard.tsx`

- [ ] **Step 1: Add PaymentDonut component**

In `AdminDashboard.tsx`, after the `ProgramDonut` component (around line 162), add:

```tsx
// ── Payment Compliance Mini Donut ─────────────────────────────────────────────

function PaymentDonut({ paid, unpaid }: { paid: number; unpaid: number }) {
  const total = paid + unpaid;
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-16 gap-1">
        <p className="text-xs text-gray-400">No data</p>
      </div>
    );
  }
  const pct = (paid / total) * 100;
  const gradient = `conic-gradient(#16a34a 0% ${pct.toFixed(1)}%, #e5e7eb ${pct.toFixed(1)}% 100%)`;
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <div className="w-full h-full rounded-full" style={{ background: gradient }} />
      <div className="absolute inset-[14px] rounded-full bg-white flex items-center justify-center shadow-inner">
        <span className="text-[9px] font-bold text-gray-700">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the payment compliance card**

In `AdminDashboard.tsx`, find the closing `</div>` of the charts row (around line 402) and the comment `{/* Activity + Quick Actions */}` on line 404. Insert the new card between them:

```tsx
      </div>

      {/* Payment Compliance */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
        className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Payment Compliance</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Session: {stats.nacosPaymentStats.session}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* NACOS Dues panel */}
          <Link
            to={`/admin/payments/nacos-dues?session=${encodeURIComponent(stats.nacosPaymentStats.session)}`}
            className="flex items-center gap-4 p-4 rounded-xl border-l-4 border-amber-400 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            <PaymentDonut paid={stats.nacosPaymentStats.paid} unpaid={stats.nacosPaymentStats.unpaid} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 mb-1">NACOS Dues</p>
              <p className="text-xs text-green-700 font-semibold">
                {stats.nacosPaymentStats.paid} paid
              </p>
              <p className="text-xs text-red-600 font-semibold">
                {stats.nacosPaymentStats.unpaid} unpaid
              </p>
              <p className="text-[10px] text-gray-400 mt-1">Click to view full list →</p>
            </div>
          </Link>

          {/* Result Sub panel */}
          <Link
            to={`/admin/payments/result-sub?session=${encodeURIComponent(stats.resultSubStats.session)}&semester=${encodeURIComponent(stats.resultSubStats.semester)}`}
            className="flex items-center gap-4 p-4 rounded-xl border-l-4 border-blue-400 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <PaymentDonut paid={stats.resultSubStats.paid} unpaid={stats.resultSubStats.unpaid} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 mb-1">Result Subscription</p>
              <p className="text-xs text-green-700 font-semibold">
                {stats.resultSubStats.paid} paid
              </p>
              <p className="text-xs text-red-600 font-semibold">
                {stats.resultSubStats.unpaid} unpaid
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                {stats.resultSubStats.semester !== '—' ? `${stats.resultSubStats.semester} semester · ` : ''}Click to view →
              </p>
            </div>
          </Link>

        </div>
      </motion.div>

      {/* Activity + Quick Actions */}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminDashboard.tsx
git commit -m "feat(dashboard): add payment compliance card with mini donuts"
```

---

## Task 7: Frontend — NacosDuesStatusPage

**Files:**
- Create: `frontend/src/pages/admin/NacosDuesStatusPage.tsx`
- Modify: `frontend/src/components/AdminLayout.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/src/pages/admin/NacosDuesStatusPage.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { paymentStatusApi, extractApiError } from '../../api/client';
import type { PaymentStatusStudent, PaginationMeta } from '../../types';

export default function NacosDuesStatusPage() {
  const [searchParams] = useSearchParams();

  const [items, setItems]     = useState<PaymentStatusStudent[]>([]);
  const [meta, setMeta]       = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [program,  setProgram]  = useState(searchParams.get('program')  ?? '');
  const [level,    setLevel]    = useState(searchParams.get('level')    ?? '');
  const [session,  setSession]  = useState(searchParams.get('session')  ?? '');
  const [status,   setStatus]   = useState(searchParams.get('status')   ?? '');
  const [page,     setPage]     = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 20 };
    if (program) params.program  = program;
    if (level)   params.level    = level;
    if (session) params.session  = session;
    if (status)  params.status   = status;

    paymentStatusApi.getNacosStudents(params)
      .then((r) => {
        setItems(r.data.data);
        setMeta(r.data.meta ?? null);
      })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [page, program, level, session, status]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    const params: Record<string, string> = {};
    if (program) params.program  = program;
    if (level)   params.level    = level;
    if (session) params.session  = session;
    if (status)  params.status   = status;
    paymentStatusApi.exportNacosPdf(params);
  };

  const resetFilters = () => {
    setProgram(''); setLevel(''); setStatus(''); setPage(1);
  };

  const paid   = items.filter((s) => s.hasPaid).length;
  const unpaid = items.filter((s) => !s.hasPaid).length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard" className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">NACOS Dues</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {session ? `Session: ${session}` : 'Payment status by student'}
              {meta ? ` · ${meta.total} students` : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 bg-white border border-gray-200 rounded-2xl p-4">
        <select value={program} onChange={(e) => { setProgram(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Programs</option>
          <option value="CSC">CSC</option>
          <option value="ICT">ICT</option>
          <option value="CRE">CRE</option>
        </select>
        <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Levels</option>
          <option value="L100">100 Level</option>
          <option value="L200">200 Level</option>
          <option value="L300">300 Level</option>
          <option value="L400">400 Level</option>
        </select>
        <input
          value={session}
          onChange={(e) => { setSession(e.target.value); setPage(1); }}
          placeholder="Session (e.g. 2024/2025)"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-44"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
        {(program || level || status) && (
          <button onClick={resetFilters}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl border border-gray-200 bg-white">
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Column headers */}
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_0.7fr_0.7fr_0.9fr_1.2fr] gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
          <span>Student</span><span>Student ID</span><span>Program</span><span>Level</span><span>Status</span><span>Paid Date</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">No students found</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((s) => (
              <div key={s.id} className="grid grid-cols-[2fr_1.5fr_0.7fr_0.7fr_0.9fr_1.2fr] gap-3 items-center px-5 py-3">
                <span className="text-sm font-medium text-gray-900 truncate">{s.name}</span>
                <span className="text-xs text-gray-500 font-mono truncate">{s.userId}</span>
                <span className="text-xs text-gray-600">{s.program}</span>
                <span className="text-xs text-gray-600">{s.level.replace('L', '')}L</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${
                  s.hasPaid
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {s.hasPaid ? 'Paid' : 'Unpaid'}
                </span>
                <span className="text-xs text-gray-500">
                  {s.paidAt ? new Date(s.paidAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="text-sm font-medium text-brand-700 disabled:text-gray-300 hover:text-brand-900 px-3 py-1.5 rounded-lg hover:bg-brand-50 disabled:bg-transparent transition-colors">
            ← Prev
          </button>
          <span className="text-xs text-gray-500">Page {page} of {meta.totalPages} · {meta.total} students</span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
            className="text-sm font-medium text-brand-700 disabled:text-gray-300 hover:text-brand-900 px-3 py-1.5 rounded-lg hover:bg-brand-50 disabled:bg-transparent transition-colors">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add PAGE_TITLES entries to AdminLayout.tsx**

In `frontend/src/components/AdminLayout.tsx`, find the `PAGE_TITLES` object and add:

```typescript
'/admin/payments/nacos-dues':  'NACOS Dues',
'/admin/payments/result-sub':  'Result Subscription',
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/NacosDuesStatusPage.tsx frontend/src/components/AdminLayout.tsx
git commit -m "feat(payments): add NACOS dues payment status page"
```

---

## Task 8: Frontend — ResultSubStatusPage

**Files:**
- Create: `frontend/src/pages/admin/ResultSubStatusPage.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/src/pages/admin/ResultSubStatusPage.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { paymentStatusApi, extractApiError } from '../../api/client';
import type { PaymentStatusStudent, PaginationMeta } from '../../types';

export default function ResultSubStatusPage() {
  const [searchParams] = useSearchParams();

  const [items, setItems]     = useState<PaymentStatusStudent[]>([]);
  const [meta, setMeta]       = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [program,  setProgram]  = useState(searchParams.get('program')  ?? '');
  const [level,    setLevel]    = useState(searchParams.get('level')    ?? '');
  const [session,  setSession]  = useState(searchParams.get('session')  ?? '');
  const [semester, setSemester] = useState(searchParams.get('semester') ?? '');
  const [status,   setStatus]   = useState(searchParams.get('status')   ?? '');
  const [page,     setPage]     = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 20 };
    if (program)  params.program  = program;
    if (level)    params.level    = level;
    if (session)  params.session  = session;
    if (semester) params.semester = semester;
    if (status)   params.status   = status;

    paymentStatusApi.getResultSubStudents(params)
      .then((r) => {
        setItems(r.data.data);
        setMeta(r.data.meta ?? null);
      })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [page, program, level, session, semester, status]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    const params: Record<string, string> = {};
    if (program)  params.program  = program;
    if (level)    params.level    = level;
    if (session)  params.session  = session;
    if (semester) params.semester = semester;
    if (status)   params.status   = status;
    paymentStatusApi.exportResultSubPdf(params);
  };

  const resetFilters = () => {
    setProgram(''); setLevel(''); setSemester(''); setStatus(''); setPage(1);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard" className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Result Subscription</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {session ? `Session: ${session}` : 'Payment status by student'}
              {semester ? ` · ${semester.charAt(0).toUpperCase() + semester.slice(1)} semester` : ''}
              {meta ? ` · ${meta.total} students` : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 bg-white border border-gray-200 rounded-2xl p-4">
        <select value={program} onChange={(e) => { setProgram(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Programs</option>
          <option value="CSC">CSC</option>
          <option value="ICT">ICT</option>
          <option value="CRE">CRE</option>
        </select>
        <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Levels</option>
          <option value="L100">100 Level</option>
          <option value="L200">200 Level</option>
          <option value="L300">300 Level</option>
          <option value="L400">400 Level</option>
        </select>
        <input
          value={session}
          onChange={(e) => { setSession(e.target.value); setPage(1); }}
          placeholder="Session (e.g. 2024/2025)"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-44"
        />
        <select value={semester} onChange={(e) => { setSemester(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Semesters</option>
          <option value="first">First</option>
          <option value="second">Second</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
        {(program || level || semester || status) && (
          <button onClick={resetFilters}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl border border-gray-200 bg-white">
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_0.7fr_0.7fr_0.8fr_0.9fr_1.2fr] gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
          <span>Student</span><span>Student ID</span><span>Program</span><span>Level</span><span>Semester</span><span>Status</span><span>Paid Date</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">No students found</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((s) => (
              <div key={s.id} className="grid grid-cols-[2fr_1.5fr_0.7fr_0.7fr_0.8fr_0.9fr_1.2fr] gap-3 items-center px-5 py-3">
                <span className="text-sm font-medium text-gray-900 truncate">{s.name}</span>
                <span className="text-xs text-gray-500 font-mono truncate">{s.userId}</span>
                <span className="text-xs text-gray-600">{s.program}</span>
                <span className="text-xs text-gray-600">{s.level.replace('L', '')}L</span>
                <span className="text-xs text-gray-600 capitalize">{s.semester ?? '—'}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${
                  s.hasPaid
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {s.hasPaid ? 'Paid' : 'Unpaid'}
                </span>
                <span className="text-xs text-gray-500">
                  {s.paidAt ? new Date(s.paidAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="text-sm font-medium text-brand-700 disabled:text-gray-300 hover:text-brand-900 px-3 py-1.5 rounded-lg hover:bg-brand-50 disabled:bg-transparent transition-colors">
            ← Prev
          </button>
          <span className="text-xs text-gray-500">Page {page} of {meta.totalPages} · {meta.total} students</span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
            className="text-sm font-medium text-brand-700 disabled:text-gray-300 hover:text-brand-900 px-3 py-1.5 rounded-lg hover:bg-brand-50 disabled:bg-transparent transition-colors">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/admin/ResultSubStatusPage.tsx
git commit -m "feat(payments): add result subscription payment status page"
```

---

## Task 9: Frontend — App.tsx routes

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add imports and routes**

In `frontend/src/App.tsx`, add these two imports after the `ActivityLogPage` import (line 42):

```typescript
import NacosDuesStatusPage  from './pages/admin/NacosDuesStatusPage';
import ResultSubStatusPage  from './pages/admin/ResultSubStatusPage';
```

Inside the admin `<Route element={<AdminLayout />}>` block (after the `activity` route on line 103), add:

```tsx
<Route path="/admin/payments/nacos-dues" element={<NacosDuesStatusPage />} />
<Route path="/admin/payments/result-sub" element={<ResultSubStatusPage />} />
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(routes): add payment status page routes"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|-------------|------|
| Dashboard mini donuts (NACOS + Result Sub) | Tasks 1, 4, 6 |
| Donuts scoped to `currentSession`/`currentSemester` | Task 1 |
| Clicking donut → detail page | Task 6 |
| NACOS detail page: filter by program/level/session/status | Task 7 |
| Result Sub detail page: filter by program/level/session/semester/status | Task 8 |
| PDF export with active filters | Tasks 2, 3, 7, 8 |
| Types updated | Task 4 |
| API client updated | Task 5 |
| Routes registered | Task 9 |
| PAGE_TITLES updated | Task 7 |

All spec requirements covered.

**Type consistency check:**
- `PaymentStatusStudent` defined in Task 4, used in Tasks 5, 7, 8 — consistent.
- `nacosPaymentStats` / `resultSubStats` field names consistent across Tasks 1, 4, 6.
- `paymentStatusService` singleton exported in Task 2, imported in Task 3 — matches.
- `exportNacosPdf` / `exportResultSubPdf` return `NodeJS.ReadableStream` in Task 2, piped to `res` in Task 3 — correct.
