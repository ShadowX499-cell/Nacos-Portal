import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authApi, extractApiError } from '../../api/client';

interface FormValues {
  email: string;
}

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState('');
  const [submitted, setSubmitted] = useState(false);
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
      await authApi.forgotPassword(data);
      setSubmitted(true);
    } catch (err) {
      setServerError(extractApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-2xl font-bold text-brand-800">N</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Forgot Password</h1>
        </div>

        <div className="card p-8">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Check your inbox</h3>
              <p className="text-sm text-gray-500 mt-2">
                If that email is registered, we've sent a password reset link.
                The link expires in 30 minutes.
              </p>
              <Link
                to="/auth/login"
                className="mt-6 inline-block btn-secondary btn-sm"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Reset your password</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter the email address linked to your account and we'll send you a reset link.
              </p>

              {serverError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div>
                  <label className="label" htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className={`input ${errors.email ? 'input-error' : ''}`}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Enter a valid email address',
                      },
                    })}
                  />
                  {errors.email && <p className="error-text">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full btn-lg"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Sending…
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                <Link to="/auth/login" className="text-brand-700 font-medium hover:text-brand-900">
                  ← Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
