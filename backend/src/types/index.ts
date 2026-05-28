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

// ── Gradebook DTOs ────────────────────────────────────────────────────────────

export interface CreateGradebookDto {
  name: string;
  level: Level;
  session: string;
  semester: 'first' | 'second';
  departmentId: string;
}

export interface CreateCourseDto {
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
}

export interface GradeEntryRow {
  userId: string;       // student UUID
  caScore: number | null;
  examScore: number | null;
}

export interface GradebookPublic {
  id: string;
  name: string;
  level: Level;
  session: string;
  semester: 'first' | 'second';
  status: 'draft' | 'published' | 'locked';
  departmentId: string;
  publishedAt: Date | null;
  createdAt: Date;
  courses?: CoursePublic[];
}

export interface CoursePublic {
  id: string;
  gradebookId: string;
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
  gradeCount?: number;
}

export interface GradePublic {
  id: string;
  courseId: string;
  userId: string;
  studentName: string;
  studentUserId: string;
  caScore: number | null;
  examScore: number | null;
  total: number | null;
  grade: string | null;
  gradePoint: number | null;
}

export interface CsvJobPublic {
  id: string;
  gradebookId: string;
  courseId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number | null;
  processedRows: number;
  errorLog: CsvRowError[] | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface CsvRowError {
  row: number;
  field: string;
  message: string;
}

// ── Snapshot (what gets stored + returned to students) ───────────────────────

export interface GradebookSnapshot {
  gradebookId: string;
  gradebookName: string;
  level: string;
  session: string;
  semester: string;
  publishedAt: string;
  courses: Array<{
    courseId: string;
    courseCode: string;
    courseTitle: string;
    creditUnits: number;
  }>;
  // outer key = student UUID, inner key = courseId
  grades: Record<string, Record<string, {
    caScore: number | null;
    examScore: number | null;
    total: number | null;
    grade: string | null;
    gradePoint: number | null;
  }>>;
  students: Record<string, { userId: string; name: string }>;
}

export interface StudentResultView {
  gradebookId: string;
  gradebookName: string;
  level: string;
  session: string;
  semester: string;
  publishedAt: string;
  courses: Array<{
    courseCode: string;
    courseTitle: string;
    creditUnits: number;
    caScore: number | null;
    examScore: number | null;
    total: number | null;
    grade: string | null;
    gradePoint: number | null;
  }>;
  sgpa: number;
  totalCredits: number;
}

export interface GpaSummary {
  semesters: Array<{
    gradebookId: string;
    gradebookName: string;
    session: string;
    semester: string;
    sgpa: number;
    totalCredits: number;
  }>;
  cgpa: number;
  totalCreditsEarned: number;
}

export interface ResultListItem {
  gradebookId: string;
  gradebookName: string;
  level: string;
  session: string;
  semester: string;
  publishedAt: string;
  hasPaid: boolean;
}

// ── Payment DTOs ──────────────────────────────────────────────────────────────

export interface InitiatePaymentDto {
  gradebookId: string;
}

export interface PaymentPublic {
  id: string;
  type: string;
  amount: number;
  currency: string;
  reference: string;
  status: string;
  sessionYear: string | null;
  semester: string | null;
  paidAt: Date | null;
  createdAt: Date;
}
