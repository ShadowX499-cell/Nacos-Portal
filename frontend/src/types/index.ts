// ── Enums (mirror backend Prisma enums) ───────────────────────────────────────

export type Program = 'ICT' | 'CSC' | 'CRE';
export type Level = 'L100' | 'L200' | 'L300' | 'L400';
export type UserRole = 'student' | 'admin' | 'super_admin';
export type UserStatus = 'pending' | 'validated' | 'suspended';
export type StudentStatus = 'active' | 'carryover' | 'graduated' | 'suspended';
export type SuperAdminType = 'course_adviser' | 'hod' | 'result_exam_officer';
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
  studentStatus: StudentStatus;
  superAdminType: SuperAdminType | null;
  profilePhotoUrl: string | null;
  dateOfBirth: string | null;
  stateOfOrigin: string | null;
  lga: string | null;
  homeAddress: string | null;
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
  dateOfBirth?: string;
  stateOfOrigin?: string;
  lga?: string;
  homeAddress?: string;
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
  studentsByProgram: { program: string; count: number }[];
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
  program: Program | null;
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

// ── Admin Notifications ───────────────────────────────────────────────────────

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  target: string;
  targetLevel: string | null;
  isSent: boolean;
  recipientCount: number;
  createdAt: string;
  sentAt: string | null;
}

export interface CreateAdminNotificationForm {
  title: string;
  body: string;
  type: 'general' | 'result' | 'election' | 'payment' | 'system';
  target: 'all' | 'level';
  targetLevel?: string;
  send: boolean;
}

// ── Department Settings ───────────────────────────────────────────────────────

export interface DepartmentSettings {
  id: string;
  name: string;
  code: string;
  faculty: string | null;
  currentSession: string | null;
  currentSemester: string | null;
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
  initiatedAt: string;
  initiatedByName: string;
}

// ── Compliance DTOs ───────────────────────────────────────────────────────────

export interface ComplianceSummary {
  nacosDue: { paid: number; total: number };
  schoolFees: { paid: number; total: number };
  courseForm: { verified: number; total: number };
}

// ── Student profile (admin view) ─────────────────────────────────────────────

export interface StudentProfile {
  profile: User;
  cgpa: number | null;
  nacosDues: { id: string; session: string | null; status: PaymentStatus; amount: number; paidAt: string | null }[];
  schoolFees: { id: string; session: string | null; semester: string | null; status: PaymentStatus; amount: number; paidAt: string | null }[];
  courseRegistrations: { id: string; session: string; semester: string; status: 'pending' | 'verified' | 'rejected'; fileUrl: string | null; submittedAt: string; reviewedAt: string | null }[];
  resultSubscriptions: { id: string; session: string | null; status: PaymentStatus; amount: number; paidAt: string | null }[];
  results: { gradebookId: string; name: string; session: string; semester: string; level: string; program: string | null; gpa: number | null; paid: boolean }[];
}
