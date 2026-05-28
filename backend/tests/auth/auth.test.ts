/**
 * Auth module unit tests — powered by Vitest (Jest-compatible API).
 * Prisma and Redis are fully mocked — no DB or Redis required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../src/modules/auth/auth.service';
import { AppError } from '../../src/utils/response';
import { UserRole, UserStatus, Program, Level } from '@prisma/client';
import bcrypt from 'bcryptjs';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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
  passwordHash: null as string | null,
  status: UserStatus.pending,
  createdById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const redisMock = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  ping: vi.fn(),
};

vi.mock('../../src/utils/email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

let service: AuthService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new AuthService(
    prismaMock as unknown as import('@prisma/client').PrismaClient,
    redisMock as unknown as import('ioredis').Redis
  );
});

// ── validateAccount ───────────────────────────────────────────────────────────

describe('AuthService.validateAccount', () => {
  it('activates a pending account successfully', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, status: UserStatus.pending });
    prismaMock.user.update.mockResolvedValue({ ...mockUser, status: UserStatus.validated });

    const result = await service.validateAccount({
      userId: 'NACOS/CSC/2024/001',
      password: 'Password1',
      confirmPassword: 'Password1',
    });

    expect(result.message).toContain('activated');
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: UserStatus.validated }),
      })
    );
  });

  it('throws 404 when user ID does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.validateAccount({ userId: 'NACOS/CSC/2024/999', password: 'Password1', confirmPassword: 'Password1' })
    ).rejects.toMatchObject({ statusCode: 404, code: 'RESOURCE_NOT_FOUND' });
  });

  it('throws 409 when account is already validated', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, status: UserStatus.validated });

    await expect(
      service.validateAccount({ userId: 'NACOS/CSC/2024/001', password: 'Password1', confirmPassword: 'Password1' })
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('throws 409 when account is suspended', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, status: UserStatus.suspended });

    await expect(
      service.validateAccount({ userId: 'NACOS/CSC/2024/001', password: 'Password1', confirmPassword: 'Password1' })
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });
});

// ── login ─────────────────────────────────────────────────────────────────────

describe('AuthService.login', () => {
  beforeEach(async () => {
    mockUser.passwordHash = await bcrypt.hash('Password1', 12);
    mockUser.status = UserStatus.validated;
  });

  it('returns accessToken + refreshToken on valid credentials', async () => {
    redisMock.get.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser });
    redisMock.setex.mockResolvedValue('OK');
    redisMock.del.mockResolvedValue(1);

    const result = await service.login({
      userId: 'NACOS/CSC/2024/001',
      password: 'Password1',
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toHaveLength(64);
    expect(result.user.userId).toBe('NACOS/CSC/2024/001');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('throws 401 on wrong password', async () => {
    redisMock.get.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser });
    redisMock.incr.mockResolvedValue(1);
    redisMock.expire.mockResolvedValue(1);

    await expect(
      service.login({ userId: 'NACOS/CSC/2024/001', password: 'WrongPass1' })
    ).rejects.toMatchObject({ statusCode: 401, code: 'AUTH_INVALID_CREDENTIALS' });
  });

  it('throws 429 when account is locked', async () => {
    redisMock.get.mockResolvedValue('1');

    await expect(
      service.login({ userId: 'NACOS/CSC/2024/001', password: 'Password1' })
    ).rejects.toMatchObject({ statusCode: 429, code: 'RATE_LIMITED' });
  });

  it('throws 403 when account is pending', async () => {
    redisMock.get.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, status: UserStatus.pending });

    await expect(
      service.login({ userId: 'NACOS/CSC/2024/001', password: 'Password1' })
    ).rejects.toMatchObject({ statusCode: 403, code: 'AUTH_ACCOUNT_PENDING' });
  });

  it('throws 401 when user not found', async () => {
    redisMock.get.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    redisMock.incr.mockResolvedValue(1);
    redisMock.expire.mockResolvedValue(1);

    await expect(
      service.login({ userId: 'NACOS/CSC/2024/999', password: 'Password1' })
    ).rejects.toMatchObject({ statusCode: 401, code: 'AUTH_INVALID_CREDENTIALS' });
  });
});

// ── refreshToken ──────────────────────────────────────────────────────────────

describe('AuthService.refreshToken', () => {
  it('issues a new access token from a valid refresh token', async () => {
    redisMock.get.mockResolvedValue('user-uuid-1');
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, status: UserStatus.validated });

    const result = await service.refreshToken('valid-refresh-token');

    expect(result.accessToken).toBeTruthy();
  });

  it('throws 401 when refresh token not in Redis', async () => {
    redisMock.get.mockResolvedValue(null);

    await expect(service.refreshToken('expired-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTH_TOKEN_EXPIRED',
    });
  });

  it('throws 401 when empty refresh token provided', async () => {
    await expect(service.refreshToken('')).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTH_TOKEN_MISSING',
    });
  });
});

// ── logout ────────────────────────────────────────────────────────────────────

describe('AuthService.logout', () => {
  it('deletes the refresh token from Redis', async () => {
    redisMock.del.mockResolvedValue(1);

    const result = await service.logout('some-refresh-token');

    expect(redisMock.del).toHaveBeenCalledWith('refresh:some-refresh-token');
    expect(result.message).toContain('Logged out');
  });

  it('succeeds even with empty token', async () => {
    const result = await service.logout('');
    expect(result.message).toContain('Logged out');
  });
});

// ── forgotPassword ────────────────────────────────────────────────────────────

describe('AuthService.forgotPassword', () => {
  it('sends a reset email and stores token in Redis', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, status: UserStatus.validated });
    redisMock.setex.mockResolvedValue('OK');

    const result = await service.forgotPassword({ email: 'ada@test.com' });

    expect(result.message).toContain('If that email is registered');
    expect(redisMock.setex).toHaveBeenCalled();
  });

  it('returns the same safe message even when email not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await service.forgotPassword({ email: 'unknown@test.com' });

    expect(result.message).toContain('If that email is registered');
    expect(redisMock.setex).not.toHaveBeenCalled();
  });
});

// ── resetPassword ─────────────────────────────────────────────────────────────

describe('AuthService.resetPassword', () => {
  it('resets the password and deletes the token', async () => {
    redisMock.get.mockResolvedValue('user-uuid-1');
    prismaMock.user.update.mockResolvedValue({ ...mockUser });
    redisMock.del.mockResolvedValue(1);

    const result = await service.resetPassword({
      token: 'valid-reset-token',
      password: 'NewPass1',
      confirmPassword: 'NewPass1',
    });

    expect(result.message).toContain('Password reset');
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-uuid-1' },
        data: expect.objectContaining({ passwordHash: expect.any(String) }),
      })
    );
    expect(redisMock.del).toHaveBeenCalledWith('reset:valid-reset-token');
  });

  it('throws 400 when reset token is invalid or expired', async () => {
    redisMock.get.mockResolvedValue(null);

    await expect(
      service.resetPassword({
        token: 'bad-token',
        password: 'NewPass1',
        confirmPassword: 'NewPass1',
      })
    ).rejects.toMatchObject({ statusCode: 400, code: 'AUTH_TOKEN_EXPIRED' });
  });
});
