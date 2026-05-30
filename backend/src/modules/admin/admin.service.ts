import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { prisma as defaultPrisma } from '../../config/prisma';
import { generateUserId } from '../../utils/id-generator';
import { sendWelcomeEmail } from '../../utils/email';
import { AppError } from '../../utils/response';
import { env } from '../../config/env';
import type {
  CreateUserDto,
  UserPublic,
  ListUsersQuery,
  PaginationMeta,
} from '../../types';

export class AdminService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  // ── Create user profile + generate ID + send email ──────────────────────

  async createUser(
    dto: CreateUserDto,
    createdById: string
  ): Promise<{ user: UserPublic; userId: string }> {
    // Check department exists
    const dept = await this.db.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!dept) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Department not found');
    }

    // Check email uniqueness
    const existing = await this.db.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new AppError(409, 'CONFLICT', 'A user with this email already exists');
    }

    // Generate unique User ID
    const userId = await generateUserId(this.db, dto.program);

    // Create the user record
    const user = await this.db.user.create({
      data: {
        userId,
        departmentId: dto.departmentId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        program: dto.program,
        level: dto.level,
        role: UserRole.student,
        status: UserStatus.pending,
        createdById,
        profilePhotoUrl: dto.profilePhotoUrl ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        stateOfOrigin: dto.stateOfOrigin ?? null,
        lga: dto.lga ?? null,
        homeAddress: dto.homeAddress ?? null,
      },
    });

    // Audit log (fire-and-forget)
    this.db.auditLog.create({
      data: {
        actorId: createdById,
        action: 'STUDENT_CREATED',
        entityType: 'user',
        entityId: user.id,
        newValue: { userId: user.userId, program: user.program, level: user.level } as Prisma.InputJsonValue,
      },
    }).catch((e: unknown) => console.error('[AdminService] Audit log failed:', e));

    // Send welcome email with the generated User ID
    const validateUrl = `${env.FRONTEND_URL}/auth/validate`;
    try {
      await sendWelcomeEmail({
        name: user.name,
        email: user.email,
        userId: user.userId,
        validateUrl,
      });
    } catch (emailErr) {
      // Email failure should NOT roll back user creation — log and continue
      console.error(`[AdminService] Failed to send welcome email to ${user.email}:`, emailErr);
    }

    return { user: this.toPublic(user), userId };
  }

  // ── List users with filters and pagination ──────────────────────────────

  async listUsers(
    departmentId: string,
    query: ListUsersQuery
  ): Promise<{ users: UserPublic[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      departmentId,
      role: UserRole.student, // admins only manage student accounts here
      ...(query.level ? { level: query.level } : {}),
      ...(query.program ? { program: query.program } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { userId: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.user.count({ where }),
    ]);

    return {
      users: users.map(this.toPublic),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get single user by UUID ─────────────────────────────────────────────

  async getUserById(id: string, departmentId: string): Promise<UserPublic> {
    const user = await this.db.user.findFirst({
      where: { id, departmentId },
    });
    if (!user) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'User not found');
    }
    return this.toPublic(user);
  }

  // ── Update user profile ─────────────────────────────────────────────────

  async updateUser(
    id: string,
    departmentId: string,
    updates: Partial<Pick<CreateUserDto, 'name' | 'email' | 'phone' | 'level' | 'program' | 'profilePhotoUrl' | 'stateOfOrigin' | 'lga' | 'homeAddress'>> & {
      status?: 'validated' | 'suspended';
      dateOfBirth?: string;
      oldPhotoUrl?: string;
    },
    actorId: string
  ): Promise<UserPublic> {
    const existing = await this.db.user.findFirst({ where: { id, departmentId } });
    if (!existing) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'User not found');
    }

    // Admins cannot delete/alter validated user records — only update mutable fields
    if (existing.status === 'validated' && updates.status === 'pending' as string) {
      throw new AppError(403, 'AUTH_FORBIDDEN', 'Cannot revert a validated account to pending');
    }

    if (updates.email && updates.email !== existing.email) {
      const emailTaken = await this.db.user.findUnique({ where: { email: updates.email } });
      if (emailTaken) {
        throw new AppError(409, 'CONFLICT', 'Email already in use by another account');
      }
    }

    // Delete old photo file if a new one is being set
    if (updates.oldPhotoUrl && updates.profilePhotoUrl && updates.oldPhotoUrl !== updates.profilePhotoUrl) {
      const filename = path.basename(updates.oldPhotoUrl);
      const filePath = path.join(process.cwd(), 'uploads', filename);
      fs.unlink(filePath, (err) => {
        if (err) console.error('[AdminService] Failed to delete old photo:', err);
      });
    }

    // Build data object — exclude oldPhotoUrl, convert dateOfBirth if provided
    const { oldPhotoUrl: _oldPhotoUrl, dateOfBirth, ...rest } = updates;
    const data: Record<string, unknown> = {
      ...rest,
      updatedAt: new Date(),
    };
    if (dateOfBirth !== undefined) {
      data.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }

    const updatedUser = await this.db.user.update({
      where: { id },
      data: data as Prisma.UserUpdateInput,
    });

    // Audit log (fire-and-forget — separate concerns)
    this.db.auditLog
      .create({
        data: {
          actorId,
          action: 'USER_UPDATED',
          entityType: 'user',
          entityId: id,
          oldValue: {
            name: existing.name,
            email: existing.email,
            level: existing.level,
            status: existing.status,
          } as Prisma.InputJsonValue,
          newValue: updates as unknown as Prisma.InputJsonValue,
        },
      })
      .catch((e: unknown) => console.error('[AdminService] Audit log failed:', e));

    return this.toPublic(updatedUser);
  }

  // ── Dashboard summary stats ─────────────────────────────────────────────

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
    recentActivity: {
      type: 'registered' | 'activated' | 'payment' | 'result_published';
      label: string;
      time: string;
    }[];
  }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

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
      successPayments,
    ] = await Promise.all([
      this.db.user.count({ where: { departmentId, role: UserRole.student } }),
      this.db.user.count({ where: { departmentId, role: UserRole.student, status: UserStatus.pending } }),
      this.db.election.count({ where: { departmentId, status: 'active' } }),
      this.db.gradebook.count({ where: { departmentId, status: 'draft' } }),
      this.db.payment.aggregate({ where: { status: 'success' }, _sum: { amount: true } }),
      this.db.gradebook.count({ where: { departmentId, status: 'published' } }),
      this.db.attendanceSession.count({ where: { departmentId, createdAt: { gte: todayStart } } }),
      this.db.gradebook.findMany({
        where: { departmentId, status: 'draft' },
        include: { courses: { include: { _count: { select: { studentGrades: true } } } } },
      }),
      this.db.user.findMany({
        where: { departmentId, role: UserRole.student },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { name: true, status: true, createdAt: true, updatedAt: true },
      }),
      this.db.payment.findMany({
        where: { status: 'success', user: { departmentId } },
        orderBy: { paidAt: 'desc' },
        take: 5,
        include: { user: { select: { name: true } } },
      }),
      this.db.gradebook.findMany({
        where: { departmentId, status: 'published' },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: { name: true, publishedAt: true },
      }),
      Promise.all(
        (['L100', 'L200', 'L300', 'L400'] as const).map(async (level) => ({
          level,
          count: await this.db.user.count({ where: { departmentId, role: UserRole.student, level } }),
        }))
      ),
      this.db.payment.findMany({
        where: { status: 'success', paidAt: { gte: sixMonthsAgo } },
        select: { amount: true, paidAt: true },
      }),
    ]);

    // Draft gradebooks where every course has at least one grade entered
    const draftGradebooksReady = draftGradebooksWithCourses.filter(
      (gb) => gb.courses.length > 0 && gb.courses.every((c) => c._count.studentGrades > 0)
    ).length;

    // Monthly revenue — last 6 months
    const monthlyMap = new Map<string, number>();
    for (const p of successPayments) {
      if (!p.paidAt) continue;
      const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(p.amount));
    }
    const monthlyRevenue: { month: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      monthlyRevenue.push({ month: label, total: monthlyMap.get(key) ?? 0 });
    }

    // Recent activity — merge, sort, take 10
    const activities: {
      type: 'registered' | 'activated' | 'payment' | 'result_published';
      label: string;
      time: string;
    }[] = [
      ...recentUsers.map((u) => ({
        type: (u.status === UserStatus.validated ? 'activated' : 'registered') as 'activated' | 'registered',
        label: u.status === UserStatus.validated
          ? `${u.name} account activated`
          : `${u.name} registered`,
        time: (u.status === UserStatus.validated ? u.updatedAt : u.createdAt).toISOString(),
      })),
      ...recentPayments.map((p) => ({
        type: 'payment' as const,
        label: `₦${Number(p.amount).toLocaleString()} payment — ${p.user.name}`,
        time: (p.paidAt ?? p.createdAt).toISOString(),
      })),
      ...recentGradebooks.map((g) => ({
        type: 'result_published' as const,
        label: `${g.name} result published`,
        time: (g.publishedAt ?? new Date()).toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);

    return {
      totalStudents,
      pendingValidations,
      activeElections,
      unpublishedResults,
      totalRevenue: Number(revenueResult._sum.amount ?? 0),
      publishedGradebooks,
      todayAttendanceSessions,
      draftGradebooksReady,
      monthlyRevenue,
      studentsByLevel: levelCounts,
      recentActivity: activities,
    };
  }

  // ── Department settings ──────────────────────────────────────────────────

  async getDepartmentSettings(departmentId: string): Promise<{
    id: string;
    name: string;
    code: string;
    faculty: string | null;
    currentSession: string | null;
    currentSemester: string | null;
  }> {
    const dept = await this.db.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Department not found');
    return {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      faculty: dept.faculty,
      currentSession: dept.currentSession,
      currentSemester: dept.currentSemester,
    };
  }

  async updateDepartmentSettings(
    departmentId: string,
    updates: { currentSession?: string; currentSemester?: 'first' | 'second' }
  ): Promise<{ id: string; name: string; code: string; faculty: string | null; currentSession: string | null; currentSemester: string | null }> {
    const dept = await this.db.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Department not found');

    const updated = await this.db.department.update({
      where: { id: departmentId },
      data: {
        ...(updates.currentSession !== undefined ? { currentSession: updates.currentSession } : {}),
        ...(updates.currentSemester !== undefined ? { currentSemester: updates.currentSemester as import('@prisma/client').Semester } : {}),
      },
    });
    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      faculty: updated.faculty,
      currentSession: updated.currentSession,
      currentSemester: updated.currentSemester,
    };
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private toPublic(user: {
    id: string;
    userId: string;
    name: string;
    email: string;
    phone: string | null;
    program: UserPublic['program'];
    level: UserPublic['level'];
    role: UserPublic['role'];
    status: UserPublic['status'];
    studentStatus: UserPublic['studentStatus'];
    superAdminType?: UserPublic['superAdminType'];
    profilePhotoUrl?: string | null;
    dateOfBirth?: Date | null;
    stateOfOrigin?: string | null;
    lga?: string | null;
    homeAddress?: string | null;
    departmentId: string;
    createdAt: Date;
    updatedAt: Date;
  }): UserPublic {
    return {
      id: user.id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      program: user.program,
      level: user.level,
      role: user.role,
      status: user.status,
      studentStatus: user.studentStatus,
      superAdminType: user.superAdminType ?? null,
      profilePhotoUrl: user.profilePhotoUrl ?? null,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : null,
      stateOfOrigin: user.stateOfOrigin ?? null,
      lga: user.lga ?? null,
      homeAddress: user.homeAddress ?? null,
      departmentId: user.departmentId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const adminService = new AdminService();
