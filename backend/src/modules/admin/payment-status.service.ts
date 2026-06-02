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
