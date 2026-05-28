import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
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
      },
    });

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
    updates: Partial<Pick<CreateUserDto, 'name' | 'email' | 'phone' | 'level' | 'program'>> & {
      status?: 'validated' | 'suspended';
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

    const updatedUser = await this.db.user.update({
      where: { id },
      data: { ...updates, updatedAt: new Date() },
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
  }> {
    const [totalStudents, pendingValidations, activeElections, unpublishedResults] =
      await Promise.all([
        this.db.user.count({ where: { departmentId, role: UserRole.student } }),
        this.db.user.count({
          where: { departmentId, role: UserRole.student, status: UserStatus.pending },
        }),
        this.db.election.count({
          where: { departmentId, status: 'active' },
        }),
        this.db.gradebook.count({
          where: { departmentId, status: 'draft' },
        }),
      ]);

    return { totalStudents, pendingValidations, activeElections, unpublishedResults };
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
      departmentId: user.departmentId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const adminService = new AdminService();
