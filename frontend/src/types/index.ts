// ── Enums (mirror backend Prisma enums) ───────────────────────────────────────

export type Program = 'ICT' | 'CSC' | 'CRE';
export type Level = 'L100' | 'L200' | 'L300' | 'L400';
export type UserRole = 'student' | 'admin' | 'super_admin';
export type UserStatus = 'pending' | 'validated' | 'suspended';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

// ── User ──────────────────────────────────────────────────────────────────────

export interface User {
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
  createdAt: string;
  updatedAt: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

// ── API response wrappers ─────────────────────────────────────────────────────

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
    details?: { field: string; message: string }[];
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Admin forms ───────────────────────────────────────────────────────────────

export interface CreateUserForm {
  name: string;
  email: string;
  phone: string;
  program: Program;
  level: Level;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalStudents: number;
  pendingValidations: number;
  activeElections: number;
  unpublishedResults: number;
}
