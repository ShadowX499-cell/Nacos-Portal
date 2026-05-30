import { Request } from 'express';
import { UserRole, UserStatus, Program, Level, StudentStatus } from '@prisma/client';

// ── Local type aliases (not yet in Prisma schema) ─────────────────────────────
export type SuperAdminType = 'course_adviser' | 'hod' | 'result_exam_officer';

// ── Augment Express Request to carry JWT payload ──────────────────────────────
export interface JwtPayload {
  sub: string;        // user UUID
  userId: string;     // NACOS/CSC/2024/47291
  role: UserRole;
  departmentId: string;
  superAdminType?: SuperAdminType | null;
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
  profilePhotoUrl?: string;
  dateOfBirth?: string;       // ISO date string YYYY-MM-DD
  stateOfOrigin?: string;
  lga?: string;
  homeAddress?: string;
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
  studentStatus: StudentStatus;
  superAdminType: SuperAdminType | null;
  profilePhotoUrl: string | null;
  dateOfBirth: string | null;
  stateOfOrigin: string | null;
  lga: string | null;
  homeAddress: string | null;
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

// ── Audit Log DTOs ────────────────────────────────────────────────────────────

export interface AuditLogPublic {
  id: string;
  actorId: string;
  actorName: string;
  actorUserId: string;
  actorRole: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: Date;
}

export interface ListAuditLogsQuery {
  page?: number;
  limit?: number;
  actorId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ── Compliance DTOs ───────────────────────────────────────────────────────────

export interface ComplianceSummary {
  nacosDue: { paid: number; total: number };
  schoolFees: { paid: number; total: number };
  courseForm: { verified: number; total: number };
}

// ── Revenue DTOs ──────────────────────────────────────────────────────────────

export interface RevenueQuery {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  session?: string;
  semester?: string;
  program?: string;
  level?: string;
  type?: string;
}

export interface RevenueSummary {
  totalRevenue: number;
  collectionRate: number;
  byType: { type: string; amount: number; count: number }[];
  byProgram: { program: string; amount: number }[];
  byLevel: { level: string; amount: number }[];
  monthlyTrend: { month: string; total: number }[];
  recentPayments: Array<PaymentPublic & { studentName: string; studentUserId: string }>;
  meta: PaginationMeta;
}

// ── Academic DTOs ─────────────────────────────────────────────────────────────

export interface AcademicAdvancePreview {
  currentSession: string;
  currentSemester: string;
  targetSession: string;
  targetSemester: string;
  type: 'semester' | 'session';
  studentsToAdvance: number;
  studentsToGraduate: number;
  unpublishedGradebooks: number;
}

export interface AcademicTransitionPublic {
  id: string;
  fromSession: string;
  fromSemester: string;
  toSession: string;
  toSemester: string;
  studentsAdvanced: number;
  studentsGraduated: number;
  initiatedAt: Date;
  initiatedByName: string;
}

export interface CarryoverCourse {
  gradeId: string;
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
  caScore: number | null;
  examScore: number | null;
  carriedFromSession: string;
  resolvedAt: Date | null;
}
