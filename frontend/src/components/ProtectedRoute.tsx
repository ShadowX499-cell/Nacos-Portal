import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface Props {
  roles?: UserRole[];
  redirectTo?: string;
}

/**
 * Wraps routes that require authentication.
 * Optionally restricts to specific roles.
 */
export function ProtectedRoute({ roles, redirectTo = '/auth/login' }: Props) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-800" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    // User is authenticated but doesn't have the required role
    const fallback =
      user.role === 'student' ? '/student/dashboard' : '/admin/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
