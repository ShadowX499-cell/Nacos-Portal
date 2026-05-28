import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, setAccessToken } from '../api/client';
import type { AuthState, User } from '../types';

// ── State & Actions ───────────────────────────────────────────────────────────

type Action =
  | { type: 'LOGIN'; payload: { user: User; accessToken: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'REFRESH_TOKEN'; payload: string };

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'REFRESH_TOKEN':
      return { ...state, accessToken: action.payload };
    default:
      return state;
  }
}

// ── Context interface ─────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (userId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();

  // Try to restore session from refresh token cookie on app load
  useEffect(() => {
    let mounted = true;

    async function tryRestoreSession() {
      try {
        const res = await authApi.refresh();
        const newToken = res.data.data.accessToken;
        setAccessToken(newToken);

        // Decode the JWT to get user info (we skip fetching /me for now)
        // In a real app you'd call GET /api/v1/auth/me here
        const payload = parseJwt(newToken);
        if (payload && mounted) {
          dispatch({
            type: 'LOGIN',
            payload: {
              accessToken: newToken,
              user: {
                id: payload.sub,
                userId: payload.userId,
                name: '',        // will be populated on next full page load / /me call
                email: '',
                phone: null,
                program: (payload.program ?? 'CSC') as import('../types').Program,
                level: (payload.level ?? 'L100') as import('../types').Level,
                role: payload.role as import('../types').UserRole,
                status: 'validated' as import('../types').UserStatus,
                departmentId: payload.departmentId,
                createdAt: '',
                updatedAt: '',
              },
            },
          });
        }
      } catch {
        // No valid refresh token — stay logged out
        if (mounted) dispatch({ type: 'SET_LOADING', payload: false });
      }
    }

    void tryRestoreSession();

    // Listen for session expiry (fired by API interceptor)
    const handleExpired = () => {
      dispatch({ type: 'LOGOUT' });
      setAccessToken(null);
      navigate('/auth/login', { replace: true });
    };
    window.addEventListener('auth:session-expired', handleExpired);

    return () => {
      mounted = false;
      window.removeEventListener('auth:session-expired', handleExpired);
    };
  }, [navigate]);

  const login = useCallback(async (userId: string, password: string) => {
    const res = await authApi.login({ userId, password });
    const { accessToken, user } = res.data.data;
    setAccessToken(accessToken);
    dispatch({ type: 'LOGIN', payload: { accessToken, user } });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      dispatch({ type: 'LOGOUT' });
      navigate('/auth/login', { replace: true });
    }
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJwt(token: string): Record<string, string> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as Record<string, string>;
  } catch {
    return null;
  }
}
