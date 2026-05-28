import { Request } from 'express';
import { UserRole, UserStatus, Program, Level } from '@prisma/client';

// ── Augment Express Request to carry JWT payload ──────────────────────────────
export interface JwtPayload {
  sub: string;        // user UUID
  userId: string;     // NACOS/CSC/2024/001
  role: UserRole;
  departmentId: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user: JwtPayload;
}

// ── API response shapes ───────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ValidationDetail[];
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ValidationDetail {
  field: string;
  message: string;
}

// ── Domain DTOs ───────────────────────────────────────────────────────────────

export interface CreateUserDto {
  name: string;
  email: string;
  phone: string;
  program: Program;
  level: Level;
  departmentId: string;
}

export interface LoginDto {
  userId: string;
  password: string;
}

export interface ValidateAccountDto {
  userId: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserPublic {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  program: Program;
  level: Level;
  role: UserRole;
  status: UserStatus;
  departmentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  level?: Level;
  program?: Program;
  status?: UserStatus;
  search?: string;
}
