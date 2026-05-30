import { PrismaClient, PaymentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import type { RevenueQuery, RevenueSummary, PaginationMeta } from '../../types';

export class RevenueService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async getSummary(query: RevenueQuery): Promise<RevenueSummary> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      status: PaymentStatus.success,
      ...(query.dateFrom || query.dateTo ? {
        paidAt: {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
        },
      } : {}),
      ...(query.session ? { sessionYear: query.session } : {}),
      ...(query.semester ? { semester: query.semester as import('@prisma/client').Semester } : {}),
      ...(query.type ? { type: query.type as import('@prisma/client').PaymentType } : {}),
      ...(query.program || query.level ? {
        user: {
          ...(query.program ? { program: query.program as import('@prisma/client').Program } : {}),
          ...(query.level ? { level: query.level as import('@prisma/client').Level } : {}),
        },
      } : {}),
    };

    // All successful payments matching filter
    const [allPayments, total] = await Promise.all([
      this.db.payment.findMany({
        where,
        include: { user: { select: { name: true, userId: true, program: true, level: true } } },
        orderBy: { paidAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.payment.count({ where }),
    ]);

    // Totals
    const totalRevenue = await this.db.payment.aggregate({ where, _sum: { amount: true } });

    // Total students in dept (for collection rate denominator — all students)
    const totalStudents = await this.db.user.count({ where: { role: 'student' } });
    const uniquePayers = await this.db.payment.groupBy({ by: ['userId'], where });
    const collectionRate = totalStudents > 0 ? (uniquePayers.length / totalStudents) * 100 : 0;

    // By type breakdown
    const byTypeRaw = await this.db.payment.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });
    const byType = byTypeRaw.map((r) => ({
      type: r.type,
      amount: Number(r._sum.amount ?? 0),
      count: r._count._all,
    }));

    // By program
    const programs = ['CSC', 'ICT', 'CRE'] as const;
    const byProgram = await Promise.all(
      programs.map(async (program) => {
        const agg = await this.db.payment.aggregate({
          where: { ...where, user: { program: program as import('@prisma/client').Program } },
          _sum: { amount: true },
        });
        return { program, amount: Number(agg._sum.amount ?? 0) };
      })
    );

    // By level
    const levels = ['L100', 'L200', 'L300', 'L400'] as const;
    const byLevel = await Promise.all(
      levels.map(async (level) => {
        const agg = await this.db.payment.aggregate({
          where: { ...where, user: { level: level as import('@prisma/client').Level } },
          _sum: { amount: true },
        });
        return { level, amount: Number(agg._sum.amount ?? 0) };
      })
    );

    // Monthly trend — last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const trendPayments = await this.db.payment.findMany({
      where: { ...where, paidAt: { gte: sixMonthsAgo } },
      select: { amount: true, paidAt: true },
    });
    const monthlyMap = new Map<string, number>();
    for (const p of trendPayments) {
      if (!p.paidAt) continue;
      const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(p.amount));
    }
    const monthlyTrend: { month: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrend.push({
        month: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        total: monthlyMap.get(key) ?? 0,
      });
    }

    const meta: PaginationMeta = { page, limit, total, totalPages: Math.ceil(total / limit) };

    return {
      totalRevenue: Number(totalRevenue._sum.amount ?? 0),
      collectionRate: Math.round(collectionRate * 10) / 10,
      byType,
      byProgram,
      byLevel,
      monthlyTrend,
      recentPayments: allPayments.map((p) => ({
        id: p.id,
        type: p.type,
        amount: Number(p.amount),
        currency: p.currency,
        reference: p.reference,
        status: p.status,
        sessionYear: p.sessionYear,
        semester: p.semester,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        studentName: p.user.name,
        studentUserId: p.user.userId,
      })),
      meta,
    };
  }

  async exportCsv(query: RevenueQuery): Promise<string> {
    const { recentPayments } = await this.getSummary({ ...query, page: 1, limit: 10000 });
    const header = 'Student Name,Student ID,Type,Amount,Reference,Session,Semester,Paid At';
    const rows = recentPayments.map((p) =>
      [
        `"${p.studentName}"`,
        p.studentUserId,
        p.type,
        p.amount,
        p.reference,
        p.sessionYear ?? '',
        p.semester ?? '',
        p.paidAt ? new Date(p.paidAt).toISOString() : '',
      ].join(',')
    );
    return [header, ...rows].join('\n');
  }
}

export const revenueService = new RevenueService();
