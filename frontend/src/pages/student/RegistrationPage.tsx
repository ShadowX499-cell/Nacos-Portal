import { useEffect, useRef, useState } from 'react';
import { registrationApi, extractApiError } from '../../api/client';
import type { Registration } from '../../types';
import { CheckCircle, AlertCircle, Upload, FileText, ExternalLink } from 'lucide-react';

const SEMESTERS = [
  { value: 'first', label: 'First Semester' },
  { value: 'second', label: 'Second Semester' },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-brand-100 text-brand-800',
  rejected: 'bg-red-100 text-red-800',
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

  // NACOS dues receipt upload state
  const [duesFile, setDuesFile] = useState<File | null>(null);
  const duesFileRef = useRef<HTMLInputElement>(null);
  const [duesSubmitting, setDuesSubmitting] = useState(false);
  const [duesSuccess, setDuesSuccess] = useState('');
  const [duesError, setDuesError] = useState('');

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

  const handleDuesUpload = async () => {
    if (!duesFile) return;
    setDuesSubmitting(true);
    setDuesError('');
    setDuesSuccess('');
    try {
      // Phase 3: will call schoolFeesApi.uploadReceipt(duesFile)
      // For now simulate async submission
      await new Promise<void>((resolve) => setTimeout(resolve, 1200));
      setDuesFile(null);
      if (duesFileRef.current) duesFileRef.current.value = '';
      setDuesSuccess('NACOS dues receipt uploaded. The finance team will verify within 24 hours.');
    } catch (err) {
      setDuesError(extractApiError(err));
    } finally {
      setDuesSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Course Registration</h1>
        <p className="text-sm text-gray-500 mt-1">Upload your course registration form for admin verification.</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-3 bg-brand-50 border border-brand-200 rounded-xl p-4 text-brand-700 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {successMsg}
        </div>
      )}

      {/* Latest status card */}
      {!loading && latestReg && (
        <div className={`bg-white rounded-2xl border-2 shadow-sm p-5 ${
          latestReg.status === 'verified' ? 'border-brand-300'
          : latestReg.status === 'rejected' ? 'border-red-300'
          : 'border-yellow-300'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-900">
                {latestReg.session} — <span className="capitalize">{latestReg.semester}</span> Semester
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Submitted {new Date(latestReg.submittedAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
              </p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_STYLES[latestReg.status]}`}>
              {STATUS_ICONS[latestReg.status]} <span className="capitalize">{latestReg.status}</span>
            </span>
          </div>
          {latestReg.status === 'rejected' && latestReg.reviewNote && (
            <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <strong>Rejection reason:</strong> {latestReg.reviewNote}
            </div>
          )}
          {latestReg.fileUrl && (
            <a
              href={latestReg.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs text-brand-700 font-medium hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              View uploaded form
            </a>
          )}
        </div>
      )}

      {/* Course form upload — hidden once verified */}
      {!loading && latestReg?.status !== 'verified' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-0.5">
            {latestReg ? 'Re-upload Course Form' : 'Upload Course Registration Form'}
          </h3>
          <p className="text-xs text-gray-400 mb-4">Accepted: PDF, JPG, PNG · Max 5 MB</p>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Session</label>
                <input
                  type="text"
                  placeholder="e.g. 2024/2025"
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {SEMESTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Course Form File</label>
              <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
                <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-500 truncate">
                  {file ? file.name : 'Click to choose file'}
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={() => void handleSubmit()}
              disabled={submitting || !file}
              className="w-full flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 text-sm"
            >
              {submitting ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Uploading…</>
              ) : (
                <><FileText className="w-4 h-4" /> Submit Registration Form</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── NACOS Dues Receipt Upload ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-base">💰</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">NACOS Dues Receipt</p>
            <p className="text-xs text-gray-400">Already paid offline? Upload your payment receipt for verification.</p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {duesError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {duesError}
            </div>
          )}
          {duesSuccess ? (
            <div className="flex items-start gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
              <CheckCircle className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-brand-800">Receipt submitted</p>
                <p className="text-xs text-brand-600 mt-0.5">{duesSuccess}</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                Accepted: PDF, JPG, PNG · Max 5 MB · Include your bank teller or transfer screenshot.
              </p>

              <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
                <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-500 truncate">
                  {duesFile ? duesFile.name : 'Click to choose receipt file'}
                </span>
                <input
                  ref={duesFileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setDuesFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => void handleDuesUpload()}
                disabled={duesSubmitting || !duesFile}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 text-sm"
              >
                {duesSubmitting ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Uploading…</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload NACOS Dues Receipt</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Submission history */}
      {registrations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 text-sm font-bold text-gray-900">
            Submission History
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Session</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Semester</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Submitted</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {registrations.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-800 text-xs font-medium">{r.session}</td>
                  <td className="px-4 py-2.5 text-gray-600 capitalize text-xs">{r.semester}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">
                    {new Date(r.submittedAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>
                      {STATUS_ICONS[r.status]} <span className="capitalize">{r.status}</span>
                    </span>
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
