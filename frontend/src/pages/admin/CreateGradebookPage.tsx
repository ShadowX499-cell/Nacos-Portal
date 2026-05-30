import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { gradebookApi, extractApiError } from '../../api/client';

interface FormValues {
  name: string;
  level: string;
  session: string;
  semester: string;
}

const LEVELS = ['L100', 'L200', 'L300', 'L400'];
const SEMESTERS = [
  { value: 'first', label: 'First Semester' },
  { value: 'second', label: 'Second Semester' },
];

export default function CreateGradebookPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { semester: 'first', level: 'L100' },
  });

  const onSubmit = async (data: FormValues) => {
    setServerError('');
    try {
      const res = await gradebookApi.create(data);
      navigate(`/admin/gradebooks/${res.data.data.id}`);
    } catch (err) {
      setServerError(extractApiError(err));
    }
  };

  return (
    <div>
      <div className="max-w-lg mx-auto px-4 md:px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Gradebook</h1>

        <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="card p-6 space-y-5">
          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">{serverError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gradebook Name</label>
            <input
              {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })}
              className="input w-full"
              placeholder="e.g. CSC 200 — 2024/2025 First Semester"
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select {...register('level', { required: true })} className="input w-full">
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select {...register('semester', { required: true })} className="input w-full">
                {SEMESTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
            <input
              {...register('session', {
                required: 'Session is required',
                pattern: { value: /^\d{4}\/\d{4}$/, message: 'Format: YYYY/YYYY (e.g. 2024/2025)' },
              })}
              className="input w-full"
              placeholder="2024/2025"
            />
            {errors.session && <p className="text-red-600 text-xs mt-1">{errors.session.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Creating…' : 'Create Gradebook'}
          </button>
        </form>
      </div>
    </div>
  );
}
