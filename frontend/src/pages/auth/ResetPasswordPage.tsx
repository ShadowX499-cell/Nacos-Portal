import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authApi, extractApiError } from '../../api/client';

interface FormValues {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    if (!token) {
      setServerError('Reset token is missing. Please request a new reset link.');
      return;
    }
    setIsSubmitting(true);
    setServerError('');
    try {
      await authApi.resetPassword({ token, ...data });
      setSuccess(true);
      setTimeout(() => navigate('/auth/login'), 3000);
    } catch (err) {
      setServerError(extractApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Invalid Reset Link</h2>
          <p className="text-sm text-gray-500 mb-6">
            This reset link is missing a token. Please request a new one.
          </p>
          <Link to="/auth/forgot-password" className="btn-primary btn-sm">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-2xl font-bold text-brand-800">N</span>
          </div>
          <h1 className="text-3xl font-bold text-white">New Password</h1>
        </div>

        <div className="card p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Password Updated!</h3>
              <p className="text-sm text-gray-500 mt-1">Redirecting to login in a moment…</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Set New Password</h2>
              <p className="text-sm text-gray-500 mb-6">
                Choose a strong password for your account.
              </p>

              {serverError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-sm text-red-700">
                  {serverError}{' '}
                  {serverError.toLowerCase().includes('expired') && (
                    <Link to="/auth/forgot-password" className="underline font-medium">
                      Request a new link.
                    </Link>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div>
                  <label className="label" htmlFor="password">New Password</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="At least 8 chars, 1 uppercase, 1 number"
                    className={`input ${errors.password ? 'input-error' : ''}`}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Minimum 8 characters' },
                      validate: {
                        hasUppercase: (v) => /[A-Z]/.test(v) || 'Must include an uppercase letter',
                        hasNumber: (v) => /[0-9]/.test(v) || 'Must include a number',
                      },
                    })}
                  />
                  {errors.password && <p className="error-text">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="label" htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat your new password"
                    className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (v) => v === watch('password') || 'Passwords do not match',
                    })}
                  />
                  {errors.confirmPassword && (
                    <p className="error-text">{errors.confirmPassword.message}</p>
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
                      Updating…
                    </>
                  ) : (
                    'Set New Password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
