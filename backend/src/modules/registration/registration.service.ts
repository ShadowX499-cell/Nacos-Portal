import { PrismaClient, RegistrationStatus, Semester } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import { AppError } from '../../utils/response';

export interface RegistrationPublic {
  id: string;
  userId: string;
  session: string;
  semester: string;
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
    return regs.map(this.toPublic);
  }

  async submitRegistration(
    userId: string,
    session: string,
    semester: string,
    fileUrl: string
  ): Promise<RegistrationPublic> {
    const existing = await this.db.courseRegistration.findUnique({
      where: { userId_session_semester: { userId, session, semester: semester as Semester } },
    });

    if (existing?.status === RegistrationStatus.verified) {
      throw new AppError(409, 'REGISTRATION_ALREADY_VERIFIED', 'Your course form is already verified and cannot be replaced');
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
      data: { userId, session, semester: semester as Semester, fileUrl, status: RegistrationStatus.pending },
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
    const reg = await this.db.courseRegistration.findUnique({ where: { id } });
    if (!reg) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Registration not found');

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
    filters: { status?: string; session?: string; semester?: string }
  ): Promise<(RegistrationPublic & { studentUserId: string; studentName: string })[]> {
    const regs = await this.db.courseRegistration.findMany({
      where: {
        user: { departmentId },
        ...(filters.status ? { status: filters.status as RegistrationStatus } : {}),
        ...(filters.session ? { session: filters.session } : {}),
        ...(filters.semester ? { semester: filters.semester as Semester } : {}),
      },
      include: { user: { select: { userId: true, name: true } } },
      orderBy: { submittedAt: 'desc' },
    });
    return regs.map((r) => ({
      ...this.toPublic(r),
      studentUserId: r.user.userId,
      studentName: r.user.name,
    }));
  }

  private toPublic(r: {
    id: string; userId: string; session: string; semester: Semester;
    fileUrl: string | null; status: RegistrationStatus; reviewNote: string | null;
    submittedAt: Date; reviewedAt: Date | null;
  }): RegistrationPublic {
    return {
      id: r.id, userId: r.userId, session: r.session, semester: r.semester,
      fileUrl: r.fileUrl, status: r.status, reviewNote: r.reviewNote,
      submittedAt: r.submittedAt, reviewedAt: r.reviewedAt,
    };
  }
}

export const registrationService = new RegistrationService();
