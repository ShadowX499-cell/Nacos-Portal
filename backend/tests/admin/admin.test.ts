/**
 * Admin module unit tests — powered by Vitest.
 * Prisma is fully mocked — no DB required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from '../../src/modules/admin/admin.service';
import { AppError } from '../../src/utils/response';
import { UserRole, UserStatus, Program, Level } from '@prisma/client';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDept = {
  id: 'dept-uuid-1',
  name: 'Computer Science',
  code: 'CSC',
  faculty: 'Science',
  isActive: true,
  createdAt: new Date(),
};

const mockUser = {
  id: 'user-uuid-1',
  userId: 'NACOS/CSC/2024/001',
  departmentId: 'dept-uuid-1',
  name: 'Ada Lovelace',
  email: 'ada@test.com',
  phone: '+2348012345678',
  program: Program.CSC,
  level: Level.L100,
  role: UserRole.student,
  passwordHash: null,
  status: UserStatus.pending,
  createdById: 'admin-uuid-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const prismaMock = {
  department: { findUnique: vi.fn() },
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  election: { count: vi.fn() },
  gradebook: { count: vi.fn() },
  auditLog: { create: vi.fn() },
};

vi.mock('../../src/utils/email', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/utils/id-generator', () => ({
  generateUserId: vi.fn().mockResolvedValue('NACOS/CSC/2024/001'),
}));

let service: AdminService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new AdminService(prismaMock as unknown as import('@prisma/client').PrismaClient);
});

// ── createUser ────────────────────────────────────────────────────────────────

describe('AdminService.createUser', () => {
  it('creates a user, returns public profile and generated userId', async () => {
    prismaMock.department.findUnique.mockResolvedValue(mockDept);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(mockUser);

    const result = await service.createUser(
      {
        name: 'Ada Lovelace',
        email: 'ada@test.com',
        phone: '+2348012345678',
        program: Program.CSC,
        level: Level.L100,
        departmentId: 'dept-uuid-1',
      },
      'admin-uuid-1'
    );

    expect(result.userId).toBe('NACOS/CSC/2024/001');
    expect(result.user.name).toBe('Ada Lovelace');
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
  });

  it('throws 404 when department not found', async () => {
    prismaMock.department.findUnique.mockResolvedValue(null);

    await expect(
      service.createUser(
        { name: 'X', email: 'x@test.com', phone: '+2348000000000', program: Program.CSC, level: Level.L100, departmentId: 'bad-dept' },
        'admin-1'
      )
    ).rejects.toMatchObject({ statusCode: 404, code: 'RESOURCE_NOT_FOUND' });
  });

  it('throws 409 when email already exists', async () => {
    prismaMock.department.findUnique.mockResolvedValue(mockDept);
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    await expect(
      service.createUser(
        { name: 'Ada', email: 'ada@test.com', phone: '+2348000000000', program: Program.CSC, level: Level.L100, departmentId: 'dept-uuid-1' },
        'admin-1'
      )
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });
});

// ── listUsers ─────────────────────────────────────────────────────────────────

describe('AdminService.listUsers', () => {
  it('returns paginated user list with meta', async () => {
    prismaMock.user.findMany.mockResolvedValue([mockUser]);
    prismaMock.user.count.mockResolvedValue(1);

    const result = await service.listUsers('dept-uuid-1', { page: 1, limit: 20 });

    expect(result.users).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
    expect(result.meta.page).toBe(1);
  });

  it('calculates totalPages correctly', async () => {
    prismaMock.user.findMany.mockResolvedValue([mockUser]);
    prismaMock.user.count.mockResolvedValue(45);

    const result = await service.listUsers('dept-uuid-1', { page: 1, limit: 20 });

    expect(result.meta.totalPages).toBe(3);
  });

  it('uses default page=1 limit=20 when not specified', async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.user.count.mockResolvedValue(0);

    const result = await service.listUsers('dept-uuid-1', {});

    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(20);
  });
});

// ── getUserById ───────────────────────────────────────────────────────────────

describe('AdminService.getUserById', () => {
  it('returns user when found', async () => {
    prismaMock.user.findFirst.mockResolvedValue(mockUser);

    const result = await service.getUserById('user-uuid-1', 'dept-uuid-1');

    expect(result.id).toBe('user-uuid-1');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws 404 when user not found', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(service.getUserById('bad-id', 'dept-uuid-1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'RESOURCE_NOT_FOUND',
    });
  });
});

// ── getDashboardStats ─────────────────────────────────────────────────────────

describe('AdminService.getDashboardStats', () => {
  it('returns counts for all four summary cards', async () => {
    prismaMock.user.count
      .mockResolvedValueOnce(120)
      .mockResolvedValueOnce(5);
    prismaMock.election.count.mockResolvedValue(1);
    prismaMock.gradebook.count.mockResolvedValue(2);

    const stats = await service.getDashboardStats('dept-uuid-1');

    expect(stats).toEqual({
      totalStudents: 120,
      pendingValidations: 5,
      activeElections: 1,
      unpublishedResults: 2,
    });
  });
});
