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
}

// ── Gradebooks ────────────────────────────────────────────────────────────────

export type GradebookStatus = 'draft' | 'published' | 'locked';
export type Semester = 'first' | 'second';

export interface Gradebook {
  id: string;
  name: string;
  level: Level;
  session: string;
  semester: Semester;
  status: GradebookStatus;
  departmentId: string;
  publishedAt: string | null;
  createdAt: string;
  courses?: Course[];
}

export interface Course {
  id: string;
  gradebookId: string;
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
  gradeCount?: number;
}

export interface Grade {
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

export interface CsvJob {
  id: string;
  gradebookId: string;
  courseId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number | null;
  processedRows: number;
  errorLog: Array<{ row: number; field: string; message: string }> | null;
  createdAt: string;
  completedAt: string | null;
}

// ── Results ───────────────────────────────────────────────────────────────────

export interface ResultListItem {
  gradebookId: string;
  gradebookName: string;
  level: string;
  session: string;
  semester: string;
  publishedAt: string;
  hasPaid: boolean;
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

// ── Payments ──────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  type: string;
  amount: number;
  currency: string;
  reference: string;
  status: string;
  sessionYear: string | null;
  semester: string | null;
  paidAt: string | null;
  createdAt: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'general' | 'result' | 'election' | 'payment' | 'system';
  target: string;
  isRead: boolean;
  createdAt: string;
}

// ── Registration ──────────────────────────────────────────────────────────────

export type RegistrationStatus = 'pending' | 'verified' | 'rejected';

export interface Registration {
  id: string;
  userId: string;
  session: string;
  semester: string;
  fileUrl: string | null;
  status: RegistrationStatus;
  reviewNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

// ── School Fees ───────────────────────────────────────────────────────────────

export interface SchoolFeesStatus {
  currentSession: string;
  status: 'not_initiated' | 'pending' | 'success' | 'failed';
  amount: number;
  paidAt: string | null;
  reference: string | null;
}

// ── Elections ─────────────────────────────────────────────────────────────────

export type ElectionStatus = 'draft' | 'active' | 'closed' | 'results_published';

export interface Election {
  id: string;
  title: string;
  description: string | null;
  status: ElectionStatus;
  positions: string[];
  eligibleLevels: string[];
  startTime: string;
  endTime: string;
  candidateCount: number;
  approvedCandidateCount: number;
  voteCount: number;
  createdAt: string;
}

export interface ElectionCandidate {
  id: string;
  electionId: string;
  position: string;
  manifesto: string | null;
  photoUrl: string | null;
  isApproved: boolean;
  studentName: string;
  studentUserId: string;
  createdAt: string;
}

export interface CandidateResult extends ElectionCandidate {
  voteCount: number;
  percentage: number;
  isWinner: boolean;
}

export interface ElectionDetail extends Election {
  candidates: ElectionCandidate[];
  results: CandidateResult[] | null;
}

export interface StudentElectionView {
  election: Election;
  candidates: ElectionCandidate[];
  myNominations: ElectionCandidate[];
  hasVoted: boolean;
  hasPaidDues: boolean;
  results: CandidateResult[] | null;
}

export interface CreateElectionForm {
  title: string;
  description: string;
  positions: string[];
  eligibleLevels: string[];
  startTime: string;
  endTime: string;
}

export interface VoteBallot {
  votes: { position: string; candidateId: string }[];
}
