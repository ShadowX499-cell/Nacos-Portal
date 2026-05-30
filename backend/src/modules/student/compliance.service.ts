import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import type { ComplianceSummary } from '../../types';

const TOTAL_SEMESTERS = 8; // 4 years × 2 semesters

export class ComplianceService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async getSummary(studentId: string): Promise<ComplianceSummary> {
    const [nacosDuePaid, schoolFeesPaid, courseFormVerified] = await Promise.all([
      this.db.payment.count({
        where: { userId: studentId, type: 'nacos_dues', status: 'success' },
      }),
      this.db.payment.count({
        where: { userId: studentId, type: 'school_fees', status: 'success' },
      }),
      this.db.courseRegistration.count({
        where: { userId: studentId, status: 'verified' },
      }),
    ]);

    return {
      nacosDue: { paid: nacosDuePaid, total: TOTAL_SEMESTERS },
      schoolFees: { paid: schoolFeesPaid, total: TOTAL_SEMESTERS },
      courseForm: { verified: courseFormVerified, total: TOTAL_SEMESTERS },
    };
  }
}

export const complianceService = new ComplianceService();
