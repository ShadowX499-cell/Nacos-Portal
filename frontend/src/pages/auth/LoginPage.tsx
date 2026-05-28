import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { extractApiError, getAccessToken } from '../../api/client';

function parseJwtRole(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (payload as { role?: string }).role ?? null;
  } catch { return null; }
}

interface FormValues {
  userId: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setServerError('');
    try {
      await login(data.userId, data.password);
      // Read role from the just-issued token (setAccessToken was already called)
      const token = getAccessToken();
      const role = token ? parseJwtRole(token) : null;
      const dest = role === 'student' ? '/student/dashboard' : '/admin/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      setServerError(extractApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-2xl font-bold text-brand-800">N</span>
          </div>
          <h1 className="text-3xl font-bold text-white">NACOS-AIFUE</h1>
          <p className="text-brand-200 mt-1 text-sm">Computer Science Department Portal</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>

          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label className="label" htmlFor="userId">
                Student / Admin ID
              </label>
              <input
                id="userId"
                type="text"
                placeholder="e.g. NACOS/CSC/2024/001"
                className={`input ${errors.userId ? 'input-error' : ''}`}
                autoComplete="username"
                {...register('userId', { required: 'User ID is required' })}
              />
              {errors.userId && (
                <p className="error-text">{errors.userId.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0" htmlFor="password">
                  Password
                </label>
                <Link
                  to="/auth/forgot-password"
                  className="text-xs text-brand-700 hover:text-brand-900 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                className={`input ${errors.password ? 'input-error' : ''}`}
                autoComplete="current-password"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && (
                <p className="error-text">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full btn-lg"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            First time?{' '}
            <Link to="/auth/validate" className="text-brand-700 font-medium hover:text-brand-900">
              Activate your account
            </Link>
          </p>
        </div>

        <p className="text-center mt-6 text-xs text-brand-300">
          © {new Date().getFullYear()} NACOS-AIFUE · Computer Science Department
        </p>
      </div>
    </div>
  );
}
