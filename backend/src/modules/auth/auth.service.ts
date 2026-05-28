import bcrypt from 'bcryptjs';
import { PrismaClient, UserStatus } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import { redis as defaultRedis } from '../../config/redis';
import {
  redisKeys,
  REFRESH_TTL_SECONDS,
  RESET_TTL_SECONDS,
} from '../../config/redis';
import { signAccessToken, generateSecureToken } from '../../utils/jwt';
import { sendPasswordResetEmail } from '../../utils/email';
import { AppError } from '../../utils/response';
import { env } from '../../config/env';
import type { Redis } from 'ioredis';
import type {
  ValidateAccountDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  TokenPair,
  UserPublic,
} from '../../types';

// The service accepts injected deps for testability (defaults to singletons)
export class AuthService {
  constructor(
    private readonly db: PrismaClient = defaultPrisma,
    private readonly cache: Redis = defaultRedis
  ) {}

  // ── Validate account (first-time password setup) ──────────────────────────

  async validateAccount(dto: ValidateAccountDto): Promise<{ message: string }> {
    const user = await this.db.user.findUnique({
      where: { userId: dto.userId },
    });

    if (!user) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'User ID not found');
    }

    if (user.status !== UserStatus.pending) {
      throw new AppError(
        409,
        'CONFLICT',
        user.status === UserStatus.validated
          ? 'Account is already activated. Please log in.'
          : 'Account is suspended. Contact the admin.'
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.db.user.update({
      where: { id: user.id },
      data: { passwordHash, status: UserStatus.validated },
    });

    return { message: 'Account activated successfully. You can now log in.' };
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<{ user: UserPublic } & TokenPair> {
    const user = await this.db.user.findUnique({
      where: { userId: dto.userId },
    });

    // Check account lock in Redis
    const lockKey = redisKeys.accountLock(dto.userId);
    const isLocked = await this.cache.get(lockKey);
    if (isLocked) {
      throw new AppError(
        429,
        'RATE_LIMITED',
        'Account is temporarily locked due to too many failed attempts. Try again in 30 minutes.'
      );
    }

    if (!user || !user.passwordHash) {
      await this.incrementLoginAttempts(dto.userId);
      throw new AppError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid User ID or password');
    }

    if (user.status === UserStatus.pending) {
      throw new AppError(403, 'AUTH_ACCOUNT_PENDING', 'Account not yet activated. Check your email for your User ID.');
    }

    if (user.status === UserStatus.suspended) {
      throw new AppError(403, 'AUTH_FORBIDDEN', 'Account suspended. Contact the admin.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      await this.incrementLoginAttempts(dto.userId);
      throw new AppError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid User ID or password');
    }

    // Clear failed attempts on successful login
    await this.cache.del(redisKeys.loginAttempts(dto.userId));

    const tokens = await this.issueTokens(user);
    const userPublic = this.toPublic(user);

    return { ...tokens, user: userPublic };
  }

  // ── Refresh access token ───────────────────────────────────────────────────

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new AppError(401, 'AUTH_TOKEN_MISSING', 'Refresh token not provided');
    }

    const key = redisKeys.refreshToken(refreshToken);
    const userId = await this.cache.get(key);

    if (!userId) {
      throw new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Refresh token is invalid or expired');
    }

    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== UserStatus.validated) {
      await this.cache.del(key);
      throw new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Session invalid');
    }

    const accessToken = signAccessToken({
      sub: user.id,
      userId: user.userId,
      role: user.role,
      departmentId: user.departmentId,
    });

    return { accessToken };
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(refreshToken: string): Promise<{ message: string }> {
    if (refreshToken) {
      await this.cache.del(redisKeys.refreshToken(refreshToken));
    }
    return { message: 'Logged out successfully' };
  }

  // ── Forgot password ───────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.db.user.findUnique({ where: { email: dto.email } });

    // Always return the same message to prevent user enumeration
    const safeMessage =
      'If that email is registered, a password reset link has been sent.';

    if (!user || user.status === UserStatus.pending) {
      return { message: safeMessage };
    }

    const resetToken = generateSecureToken();
    const key = redisKeys.resetToken(resetToken);
    await this.cache.setex(key, RESET_TTL_SECONDS, user.id);

    const resetUrl = `${env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail({
      name: user.name,
      email: user.email,
      resetUrl,
    });

    return { message: safeMessage };
  }

  // ── Reset password ────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const key = redisKeys.resetToken(dto.token);
    const userId = await this.cache.get(key);

    if (!userId) {
      throw new AppError(
        400,
        'AUTH_TOKEN_EXPIRED',
        'Reset token is invalid or has expired. Please request a new password reset.'
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.db.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Consume the token (one-time use)
    await this.cache.del(key);

    return { message: 'Password reset successfully. You can now log in.' };
  }

  // ── Get current user profile ───────────────────────────────────────────────

  async getMe(userId: string): Promise<UserPublic> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'User not found');
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

  // ── Private helpers ───────────────────────────────────────────────────────

  private async issueTokens(user: {
    id: string;
    userId: string;
    role: UserPublic['role'];
    departmentId: string;
  }): Promise<TokenPair> {
    const accessToken = signAccessToken({
      sub: user.id,
      userId: user.userId,
      role: user.role,
      departmentId: user.departmentId,
    });

    const refreshToken = generateSecureToken();
    const key = redisKeys.refreshToken(refreshToken);
    await this.cache.setex(key, REFRESH_TTL_SECONDS, user.id);

    return { accessToken, refreshToken };
  }

  private async incrementLoginAttempts(userId: string): Promise<void> {
    const attemptsKey = redisKeys.loginAttempts(userId);
    const attempts = await this.cache.incr(attemptsKey);

    // Set expiry on first attempt
    if (attempts === 1) {
      await this.cache.expire(attemptsKey, 30 * 60); // 30 min window
    }

    if (attempts >= 5) {
      // Lock the account for 30 minutes
      await this.cache.setex(redisKeys.accountLock(userId), 30 * 60, '1');
      await this.cache.del(attemptsKey);
    }
  }

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

// Default singleton instance
export const authService = new AuthService();
