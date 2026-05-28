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

  createUser: (body: import('../types').CreateUserForm) =>
    api.post<{ success: true; data: { user: import('../types').User; userId: string } }>(
      '/admin/users',
      body
    ),

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
