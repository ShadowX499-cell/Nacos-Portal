import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { adminApi, extractApiError } from '../../api/client';
import type { CreateUserForm } from '../../types';

interface SuccessData {
  userId: string;
  name: string;
  email: string;
}

export default function CreateUserPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>();

  const onSubmit = async (data: CreateUserForm) => {
    setIsSubmitting(true);
    setServerError('');
    try {
      const res = await adminApi.createUser(data);
      const { user, userId } = res.data.data;
      setSuccessData({ userId, name: user.name, email: user.email });
      reset();
    } catch (err) {
      setServerError(extractApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-brand-800 text-white px-6 py-4 flex items-center gap-3 shadow-lg">
        <Link to="/admin/dashboard" className="text-brand-200 hover:text-white text-sm">
          ← Dashboard
        </Link>
        <span className="text-brand-400">/</span>
        <span className="text-sm">Add Student</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Add New Student</h1>
        <p className="text-sm text-gray-500 mb-8">
          Fill in the details below. The system will auto-generate a NACOS Student ID and email
          it to the student.
        </p>

        {/* Success Banner */}
        {successData && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-green-800">Student added successfully!</h3>
                <p className="text-sm text-green-700 mt-1">
                  <span className="font-mono font-bold">{successData.userId}</span> has been sent to{' '}
                  <strong>{successData.email}</strong>.
                </p>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => setSuccessData(null)}
                    className="btn-secondary btn-sm"
                  >
                    Add Another
                  </button>
                  <button
                    onClick={() => navigate('/admin/users')}
                    className="btn-primary btn-sm"
                  >
                    View All Students
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card p-8">
          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Name */}
            <div>
              <label className="label" htmlFor="name">Full Name <span className="text-red-500">*</span></label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Ada Lovelace"
                className={`input ${errors.name ? 'input-error' : ''}`}
                {...register('name', {
                  required: 'Full name is required',
                  minLength: { value: 2, message: 'At least 2 characters' },
                  maxLength: { value: 100, message: 'Maximum 100 characters' },
                })}
              />
              {errors.name && <p className="error-text">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="label" htmlFor="email">Email Address <span className="text-red-500">*</span></label>
              <input
                id="email"
                type="email"
                placeholder="student@example.com"
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

            {/* Phone */}
            <div>
              <label className="label" htmlFor="phone">Phone Number <span className="text-red-500">*</span></label>
              <input
                id="phone"
                type="tel"
                placeholder="+2348012345678"
                className={`input ${errors.phone ? 'input-error' : ''}`}
                {...register('phone', {
                  required: 'Phone number is required',
                  pattern: {
                    value: /^\+?[0-9]{7,15}$/,
                    message: 'Enter a valid phone number',
                  },
                })}
              />
              {errors.phone && <p className="error-text">{errors.phone.message}</p>}
            </div>

            {/* Program + Level row */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="label" htmlFor="program">Program <span className="text-red-500">*</span></label>
                <select
                  id="program"
                  className={`input ${errors.program ? 'input-error' : ''}`}
                  {...register('program', { required: 'Program is required' })}
                >
                  <option value="">Select program</option>
                  <option value="CSC">CSC — Computer Science</option>
                  <option value="ICT">ICT — Information & Comm. Tech.</option>
                  <option value="CRE">CRE — Computer with Economics</option>
                </select>
                {errors.program && <p className="error-text">{errors.program.message}</p>}
              </div>

              <div>
                <label className="label" htmlFor="level">Level <span className="text-red-500">*</span></label>
                <select
                  id="level"
                  className={`input ${errors.level ? 'input-error' : ''}`}
                  {...register('level', { required: 'Level is required' })}
                >
                  <option value="">Select level</option>
                  <option value="L100">100 Level</option>
                  <option value="L200">200 Level</option>
                  <option value="L300">300 Level</option>
                  <option value="L400">400 Level</option>
                </select>
                {errors.level && <p className="error-text">{errors.level.message}</p>}
              </div>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <strong>📧 Auto-email:</strong> After saving, the system will automatically
              generate a unique Student ID and email it to the student's address.
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg flex-1">
                {isSubmitting ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Creating…
                  </>
                ) : (
                  'Create & Send ID'
                )}
              </button>
              <Link to="/admin/dashboard" className="btn-secondary btn-lg">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
