import { PrismaClient, RegistrationStatus, RegistrationType, Semester } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import { AppError } from '../../utils/response';

export interface RegistrationPublic {
  id: string;
  userId: string;
  session: string;
  semester: string;
  type: string;
  fileUrl: string | null;
  status: string;
  reviewNote: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
}

export class RegistrationService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async listRegistrations(userId: string): Promise<RegistrationPublic[]> {
    const regs = await this.db.courseRegistration.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });
    return regs.map((r) => this.toPublic(r));
  }

  async submitRegistration(
    userId: string,
    session: string,
    semester: string,
    fileUrl: string,
    type: RegistrationType = RegistrationType.course_form
  ): Promise<RegistrationPublic> {
    const existing = await this.db.courseRegistration.findFirst({
      where: { userId, session, semester: semester as Semester, type },
    });

    if (existing?.status === RegistrationStatus.verified) {
      throw new AppError(409, 'REGISTRATION_ALREADY_VERIFIED', 'This submission is already verified and cannot be replaced');
    }

    if (existing) {
      const updated = await this.db.courseRegistration.update({
        where: { id: existing.id },
        data: {
          fileUrl,
          status: RegistrationStatus.pending,
          reviewNote: null,
          reviewedById: null,
          reviewedAt: null,
        },
      });
      return this.toPublic(updated);
    }

    const reg = await this.db.courseRegistration.create({
      data: { userId, session, semester: semester as Semester, type, fileUrl, status: RegistrationStatus.pending },
    });
    return this.toPublic(reg);
  }

  async reviewRegistration(
    id: string,
    departmentId: string,
    reviewerId: string,
    status: 'verified' | 'rejected',
    reviewNote: string | null
  ): Promise<RegistrationPublic> {
    const reg = await this.db.courseRegistration.findUnique({
      where: { id },
      include: { user: { select: { departmentId: true } } },
    });
    if (!reg) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Registration not found');
    if (reg.user.departmentId !== departmentId) {
      throw new AppError(403, 'AUTH_FORBIDDEN', 'Registration does not belong to your department');
    }

    const updated = await this.db.courseRegistration.update({
      where: { id },
      data: {
        status: status as RegistrationStatus,
        reviewedById: reviewerId,
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
      },
    });
    return this.toPublic(updated);
  }

  async listAllForAdmin(
    departmentId: string,
    filters: { status?: string; session?: string; semester?: string; type?: string }
  ): Promise<(RegistrationPublic & { studentUserId: string; studentName: string })[]> {
    const regs = await this.db.courseRegistration.findMany({
      where: {
        user: { departmentId },
        ...(filters.status   ? { status:   filters.status   as RegistrationStatus } : {}),
        ...(filters.session  ? { session:  filters.session  } : {}),
        ...(filters.semester ? { semester: filters.semester as Semester } : {}),
        ...(filters.type     ? { type:     filters.type     as RegistrationType } : {}),
      },
      include: { user: { select: { userId: true, name: true } } },
      orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }],
    });
    return regs.map((r) => ({
      ...this.toPublic(r),
      studentUserId: r.user.userId,
      studentName: r.user.name,
    }));
  }

  async getPendingCount(departmentId: string): Promise<number> {
    return this.db.courseRegistration.count({
      where: {
        user: { departmentId },
        status: RegistrationStatus.pending,
      },
    });
  }

  private toPublic(r: {
    id: string; userId: string; session: string; semester: Semester;
    type: RegistrationType; fileUrl: string | null; status: RegistrationStatus;
    reviewNote: string | null; submittedAt: Date; reviewedAt: Date | null;
  }): RegistrationPublic {
    return {
      id: r.id, userId: r.userId, session: r.session, semester: r.semester,
      type: r.type, fileUrl: r.fileUrl, status: r.status,
      reviewNote: r.reviewNote, submittedAt: r.submittedAt, reviewedAt: r.reviewedAt,
    };
  }
}

export const registrationService = new RegistrationService();
