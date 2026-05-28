import { useEffect, useRef, useState } from 'react';
import { registrationApi, extractApiError } from '../../api/client';
import type { Registration } from '../../types';

const SEMESTERS = [
  { value: 'first', label: 'First Semester' },
  { value: 'second', label: 'Second Semester' },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'badge-yellow',
  verified: 'badge-green',
  rejected: 'badge-red',
};

const STATUS_ICONS: Record<string, string> = { pending: '⏳', verified: '✅', rejected: '❌' };

export default function RegistrationPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [session, setSession] = useState('');
  const [semester, setSemester] = useState('first');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    registrationApi.list()
      .then((r) => setRegistrations(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const latestReg = registrations[0] ?? null;

  const handleSubmit = async () => {
    if (!file || !session.match(/^\d{4}\/\d{4}$/)) {
      setError('Please enter a valid session (YYYY/YYYY) and select a file.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      await registrationApi.submit(session, semester, file);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setSuccessMsg('Course registration form submitted successfully. Awaiting admin review.');
      load();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Course Registration</h1>
      <p className="text-sm text-gray-500 mb-6">Upload your course registration form for admin verification</p>

      {error && <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm mb-4">{error}</div>}
      {successMsg && <div className="bg-green-50 border border-green-200 rounded p-3 text-green-700 text-sm mb-4">{successMsg}</div>}

      {/* Latest status card */}
      {!loading && latestReg && (
        <div className={`card p-4 mb-4 border-l-4 ${
          latestReg.status === 'verified' ? 'border-green-500'
          : latestReg.status === 'rejected' ? 'border-red-400'
          : 'border-yellow-400'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {latestReg.session} — <span className="capitalize">{latestReg.semester}</span> Semester
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Submitted {new Date(latestReg.submittedAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`badge ${STATUS_STYLES[latestReg.status]}`}>
              {STATUS_ICONS[latestReg.status]} {latestReg.status}
            </span>
          </div>
          {latestReg.status === 'rejected' && latestReg.reviewNote && (
            <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-700">
              <strong>Rejection reason:</strong> {latestReg.reviewNote}
            </div>
          )}
          {latestReg.fileUrl && (
            <a href={latestReg.fileUrl} target="_blank" rel="noreferrer"
              className="mt-2 inline-block text-xs text-brand-800 hover:underline">
              View uploaded form →
            </a>
          )}
        </div>
      )}

      {/* Upload form — hidden once verified */}
      {!loading && latestReg?.status !== 'verified' && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {latestReg ? 'Re-upload Course Form' : 'Upload Course Registration Form'}
          </h3>
          <p className="text-xs text-gray-400 mb-4">Accepted: PDF, JPG, PNG · Max 5 MB</p>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Session</label>
                <input
                  type="text"
                  placeholder="e.g. 2024/2025"
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="label text-xs">Semester</label>
                <select value={semester} onChange={(e) => setSemester(e.target.value)} className="input text-sm">
                  {SEMESTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label text-xs">Course Form File</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block text-sm text-gray-600"
              />
            </div>
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting || !file}
              className="btn-primary w-full disabled:opacity-60"
            >
              {submitting ? 'Uploading…' : 'Submit Registration Form'}
            </button>
          </div>
        </div>
      )}

      {/* History table */}
      {registrations.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
            Submission History
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Session</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Semester</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Submitted</th>
                <th className="text-center px-4 py-2 text-xs font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registrations.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-800">{r.session}</td>
                  <td className="px-4 py-2 text-gray-600 capitalize">{r.semester}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{new Date(r.submittedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`badge ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
