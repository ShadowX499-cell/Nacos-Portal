import axios, { AxiosError, AxiosInstance } from 'axios';
import { ApiError } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

// Singleton Axios instance
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // needed for HttpOnly refreshToken cookie
  headers: { 'Content-Type': 'application/json' },
});

// ── Token helpers (module-level so interceptors can read current value) ───────
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ── Request interceptor — attach Bearer token ─────────────────────────────────
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// ── Response interceptor — silent refresh on 401 ─────────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token!)
  );
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue subsequent requests while refreshing
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers!.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ success: true; data: { accessToken: string } }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = data.data.accessToken;
        setAccessToken(newToken);
        processQueue(null, newToken);

        originalRequest.headers!.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        // Dispatch a custom event so AuthContext can redirect to login
        window.dispatchEvent(new Event('auth:session-expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Typed error extractor ─────────────────────────────────────────────────────

export function extractApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    return data?.error?.message ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  validate: (body: { userId: string; password: string; confirmPassword: string }) =>
    api.post('/auth/validate', body),

  login: (body: { userId: string; password: string }) =>
    api.post<{ success: true; data: { accessToken: string; user: import('../types').User } }>(
      '/auth/login',
      body
    ),

  refresh: () =>
    api.post<{ success: true; data: { accessToken: string } }>('/auth/refresh'),

  logout: () => api.post('/auth/logout'),

  forgotPassword: (body: { email: string }) =>
    api.post('/auth/forgot-password', body),

  resetPassword: (body: { token: string; password: string; confirmPassword: string }) =>
    api.post('/auth/reset-password', body),
};

// ── Admin API ─────────────────────────────────────────────────────────────────

export const adminApi = {
  getDashboard: () =>
    api.get<{ success: true; data: import('../types').DashboardStats }>('/admin/dashboard'),

  createUser: (body: import('../types').CreateUserForm, photo?: File | null) => {
    const form = new FormData();
    Object.entries(body).forEach(([k, v]) => { if (v !== undefined && v !== '') form.append(k, v as string); });
    if (photo) form.append('photo', photo);
    return api.post<{ success: true; data: { user: import('../types').User; userId: string } }>(
      '/admin/users',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  listUsers: (params?: Record<string, string | number>) =>
    api.get<{
      success: true;
      data: import('../types').User[];
      meta: import('../types').PaginationMeta;
    }>('/admin/users', { params }),

  getUserById: (id: string) =>
    api.get<{ success: true; data: import('../types').User }>(`/admin/users/${id}`),

  updateUser: (id: string, body: Partial<import('../types').User>) =>
    api.patch<{ success: true; data: import('../types').User }>(`/admin/users/${id}`, body),
};

// ── Student Compliance API ────────────────────────────────────────────────────

export const complianceApi = {
  getSummary: () =>
    api.get<{ success: true; data: import('../types').ComplianceSummary }>('/student/compliance'),
};

// ── Revenue API (HOD) ─────────────────────────────────────────────────────────

export interface RevenueSummary {
  totalRevenue: number;
  collectionRate: number;
  byType: { type: string; amount: number; count: number }[];
  byProgram: { program: string; amount: number }[];
  byLevel: { level: string; amount: number }[];
  monthlyTrend: { month: string; total: number }[];
  recentPayments: Array<{
    id: string; type: string; amount: number; currency: string; reference: string;
    status: string; sessionYear: string | null; semester: string | null;
    paidAt: string | null; createdAt: string; studentName: string; studentUserId: string;
  }>;
  meta: import('../types').PaginationMeta;
}

export const revenueApi = {
  getSummary: (params?: Record<string, string | number>) =>
    api.get<{ success: true; data: RevenueSummary }>('/admin/revenue', { params }),
  exportCsv: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    window.open(`${api.defaults.baseURL}/admin/revenue/export${qs}`, '_blank');
  },
};

// ── Academic API (HOD) ────────────────────────────────────────────────────────

export const academicApi = {
  preview: () =>
    api.get<{ success: true; data: import('../types').AcademicAdvancePreview }>('/admin/academic/preview'),
  advance: (body: { type: 'semester' | 'session'; confirm: boolean; force?: boolean }) =>
    api.post<{ success: true; data: import('../types').AcademicTransitionPublic }>('/admin/academic/advance', body),
  listTransitions: () =>
    api.get<{ success: true; data: import('../types').AcademicTransitionPublic[] }>('/admin/academic/transitions'),
};

// ── Super Admins API ──────────────────────────────────────────────────────────

export const superAdminsApi = {
  list: () =>
    api.get<{ success: true; data: import('../types').User[] }>('/admin/super-admins'),
  assign: (userId: string, superAdminType: import('../types').SuperAdminType) =>
    api.post<{ success: true; data: import('../types').User }>('/admin/super-admins', { userId, superAdminType }),
  revoke: (id: string) =>
    api.delete<{ success: true; data: import('../types').User }>(`/admin/super-admins/${id}`),
};

// ── Audit Logs API ────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string; actorId: string; actorName: string; actorUserId: string;
  actorRole: string; action: string; entityType: string | null;
  entityId: string | null; oldValue: unknown; newValue: unknown;
  ipAddress: string | null; createdAt: string;
}

export const auditLogsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<{ success: true; data: AuditLogEntry[]; meta: import('../types').PaginationMeta }>('/admin/audit-logs', { params }),
  listOwn: (params?: Record<string, string | number>) =>
    api.get<{ success: true; data: AuditLogEntry[]; meta: import('../types').PaginationMeta }>('/admin/audit-logs/me', { params }),
  getById: (id: string) =>
    api.get<{ success: true; data: AuditLogEntry }>(`/admin/audit-logs/${id}`),
};

// ── Gradebook API (admin) ─────────────────────────────────────────────────────

export const gradebookApi = {
  list: (params?: Record<string, string>) =>
    api.get<{ success: true; data: import('../types').Gradebook[] }>('/gradebooks', { params }),

  create: (body: { name: string; level: string; session: string; semester: string }) =>
    api.post<{ success: true; data: import('../types').Gradebook }>('/gradebooks', body),

  get: (id: string) =>
    api.get<{ success: true; data: import('../types').Gradebook & { courses: import('../types').Course[] } }>(`/gradebooks/${id}`),

  publish: (id: string) =>
    api.post<{ success: true; data: import('../types').Gradebook }>(`/gradebooks/${id}/publish`),

  addCourse: (id: string, body: { courseCode: string; courseTitle: string; creditUnits: number }) =>
    api.post<{ success: true; data: import('../types').Course }>(`/gradebooks/${id}/courses`, body),

  removeCourse: (id: string, courseId: string) =>
    api.delete(`/gradebooks/${id}/courses/${courseId}`),

  getGrades: (id: string, courseId: string) =>
    api.get<{ success: true; data: import('../types').Grade[] }>(`/gradebooks/${id}/courses/${courseId}/grades`),

  upsertGrades: (id: string, courseId: string, grades: Array<{ userId: string; caScore: number | null; examScore: number | null }>) =>
    api.put(`/gradebooks/${id}/courses/${courseId}/grades`, { grades }),

  uploadCsv: (id: string, courseId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ success: true; data: { jobId: string } }>(`/gradebooks/${id}/courses/${courseId}/csv`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listCsvJobs: (id: string) =>
    api.get<{ success: true; data: import('../types').CsvJob[] }>(`/gradebooks/${id}/csv-jobs`),

  getCsvJob: (id: string, jobId: string) =>
    api.get<{ success: true; data: import('../types').CsvJob }>(`/gradebooks/${id}/csv-jobs/${jobId}`),
};

// ── Results API (student) ─────────────────────────────────────────────────────

export const resultsApi = {
  list: () =>
    api.get<{ success: true; data: import('../types').ResultListItem[] }>('/results'),

  get: (gradebookId: string) =>
    api.get<{ success: true; data: import('../types').StudentResultView }>(`/results/${gradebookId}`),

  getGpa: () =>
    api.get<{ success: true; data: import('../types').GpaSummary }>('/results/gpa'),
};

// ── Payments API ──────────────────────────────────────────────────────────────

export const paymentsApi = {
  initiate: (gradebookId: string) =>
    api.post<{ success: true; data: { authorization_url: string; reference: string } }>('/payments/initiate', { gradebookId }),

  verify: (reference: string) =>
    api.get<{ success: true; data: import('../types').Payment }>(`/payments/verify/${reference}`),

  history: () =>
    api.get<{ success: true; data: import('../types').Payment[] }>('/payments'),
};

// ── Notifications API ─────────────────────────────────────────────────────────

export const notificationsApi = {
  list: () =>
    api.get<{ success: true; data: import('../types').Notification[] }>('/notifications'),

  markRead: (id: string) =>
    api.post(`/notifications/${id}/read`),

  markAllRead: () =>
    api.post('/notifications/read-all'),

  getUnreadCount: () =>
    api.get<{ success: true; data: { count: number } }>('/notifications/unread-count'),
};

// ── Registration API ──────────────────────────────────────────────────────────

export const registrationApi = {
  list: () =>
    api.get<{ success: true; data: import('../types').Registration[] }>('/registration'),

  submit: (session: string, semester: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('session', session);
    form.append('semester', semester);
    return api.post<{ success: true; data: import('../types').Registration }>('/registration', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── School Fees API ───────────────────────────────────────────────────────────

export const schoolFeesApi = {
  getStatus: () =>
    api.get<{ success: true; data: import('../types').SchoolFeesStatus }>('/payments/school-fees/status'),

  initiate: (sessionYear: string) =>
    api.post<{ success: true; data: { authorization_url: string; reference: string } }>(
      '/payments/school-fees/initiate', { sessionYear }
    ),
};

// ── Auth /me ──────────────────────────────────────────────────────────────────

export const profileApi = {
  getMe: () =>
    api.get<{ success: true; data: import('../types').User }>('/auth/me'),
};

// ── Elections API (admin) ─────────────────────────────────────────────────────

export const electionsAdminApi = {
  list: () =>
    api.get<{ success: true; data: import('../types').Election[] }>('/elections'),

  create: (body: import('../types').CreateElectionForm) =>
    api.post<{ success: true; data: import('../types').Election }>('/elections', body),

  get: (id: string) =>
    api.get<{ success: true; data: import('../types').ElectionDetail }>(`/elections/${id}`),

  updateStatus: (id: string, action: 'activate' | 'close' | 'publish') =>
    api.patch<{ success: true; data: import('../types').Election }>(`/elections/${id}/status`, { action }),

  delete: (id: string) =>
    api.delete(`/elections/${id}`),

  listCandidates: (id: string) =>
    api.get<{ success: true; data: import('../types').ElectionCandidate[] }>(`/elections/${id}/candidates`),

  reviewCandidate: (id: string, candidateId: string, approved: boolean) =>
    api.patch<{ success: true; data: import('../types').ElectionCandidate }>(
      `/elections/${id}/candidates/${candidateId}`,
      { approved }
    ),
};

// ── Elections API (student) ───────────────────────────────────────────────────

export const electionsStudentApi = {
  getActive: () =>
    api.get<{ success: true; data: import('../types').StudentElectionView | null }>('/elections/active'),

  nominate: (id: string, body: { position: string; manifesto: string; photoUrl?: string }) =>
    api.post<{ success: true; data: import('../types').ElectionCandidate }>(`/elections/${id}/candidates`, body),

  vote: (id: string, body: import('../types').VoteBallot) =>
    api.post<{ success: true; data: null }>(`/elections/${id}/vote`, body),
};

// ── Admin Notifications API ───────────────────────────────────────────────────

export const adminNotificationsApi = {
  list: (status?: 'sent' | 'draft') =>
    api.get<{ success: true; data: import('../types').AdminNotification[] }>(
      '/admin/notifications',
      { params: status ? { status } : {} }
    ),

  create: (body: import('../types').CreateAdminNotificationForm) =>
    api.post<{ success: true; data: import('../types').AdminNotification }>(
      '/admin/notifications',
      body
    ),

  send: (id: string) =>
    api.patch<{ success: true; data: import('../types').AdminNotification }>(
      `/admin/notifications/${id}/send`
    ),

  delete: (id: string) =>
    api.delete(`/admin/notifications/${id}`),
};

// ── Admin Settings API ────────────────────────────────────────────────────────

export const adminSettingsApi = {
  getDepartment: () =>
    api.get<{ success: true; data: import('../types').DepartmentSettings }>(
      '/admin/settings/department'
    ),

  updateDepartment: (body: { currentSession?: string; currentSemester?: string }) =>
    api.patch<{ success: true; data: import('../types').DepartmentSettings }>(
      '/admin/settings/department',
      body
    ),
};
