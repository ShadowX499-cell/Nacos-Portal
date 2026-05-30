import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarDays, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { academicApi, extractApiError } from '../../api/client';
import type { AcademicAdvancePreview, AcademicTransitionPublic } from '../../types';

function AdvanceModal({
  preview,
  onClose,
  onSuccess,
}: {
  preview: AcademicAdvancePreview;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [force, setForce] = useState(false);

  const handleAdvance = async () => {
    setLoading(true); setError('');
    try {
      await academicApi.advance({ type: preview.type, confirm: true, force });
      onSuccess();
      onClose();
    } catch (err) {
      const msg = extractApiError(err);
      if (msg.includes('UNPUBLISHED_GRADEBOOKS')) {
        setForce(true);
        setError(`Warning: ${preview.unpublishedGradebooks} gradebook(s) still in draft. Check the box below to advance anyway.`);
      } else {
        setError(msg);
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Confirm Calendar Advance</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>

        {/* Summary */}
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">From</span>
            <span className="font-semibold">{preview.currentSession} · {preview.currentSemester} semester</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">To</span>
            <span className="font-semibold text-brand-700">{preview.targetSession} · {preview.targetSemester} semester</span>
          </div>
        </div>

        {preview.type === 'session' && (
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-gray-600">Students advancing a level</span>
              <span className="font-bold text-green-700">{preview.studentsToAdvance}</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-gray-600">L400 students graduating</span>
              <span className="font-bold text-purple-700">{preview.studentsToGraduate}</span>
            </div>
          </div>
        )}

        {preview.unpublishedGradebooks > 0 && (
          <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-800">
              <strong>{preview.unpublishedGradebooks} gradebook(s)</strong> for this semester are still in draft — carryover computation will miss those results.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {force && (
          <label className="flex items-center gap-2 text-sm text-gray-700 mb-4 cursor-pointer">
            <input type="checkbox" checked={force} onChange={() => setForce((v) => !v)} className="rounded" />
            I understand — advance anyway with unpublished gradebooks
          </label>
        )}

        <div className="flex gap-3">
          <button onClick={handleAdvance} disabled={loading}
            className="btn-primary btn-sm flex-1 bg-brand-700">
            {loading ? 'Advancing…' : `Advance to ${preview.targetSemester} semester`}
          </button>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AcademicCalendarPage() {
  const [preview, setPreview] = useState<AcademicAdvancePreview | null>(null);
  const [transitions, setTransitions] = useState<AcademicTransitionPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      academicApi.preview().then((r) => setPreview(r.data.data)),
      academicApi.listTransitions().then((r) => setTransitions(r.data.data)),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
      {showModal && preview && (
        <AdvanceModal preview={preview} onClose={() => setShowModal(false)} onSuccess={load} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Advance the department semester or session</p>
        </div>
        <CalendarDays className="w-8 h-8 text-brand-600" />
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-sm text-red-700">{error}</div>}

      {/* Current state */}
      {preview && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Current State</p>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
              <p className="text-xs text-brand-600 font-semibold mb-1">Session</p>
              <p className="text-xl font-black text-brand-900">{preview.currentSession}</p>
            </div>
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
              <p className="text-xs text-brand-600 font-semibold mb-1">Semester</p>
              <p className="text-xl font-black text-brand-900 capitalize">{preview.currentSemester}</p>
            </div>
          </div>

          {/* Next step */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
            <div>
              <p className="text-sm font-semibold text-gray-700">Next: {preview.targetSemester} semester {preview.targetSession !== preview.currentSession ? `(new session ${preview.targetSession})` : ''}</p>
              {preview.type === 'session' && (
                <p className="text-xs text-gray-500 mt-1">
                  {preview.studentsToAdvance} students will advance · {preview.studentsToGraduate} will graduate
                </p>
              )}
              {preview.unpublishedGradebooks > 0 && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {preview.unpublishedGradebooks} unpublished gradebook(s)
                </p>
              )}
            </div>
            <button onClick={() => setShowModal(true)}
              className="btn-primary btn-sm whitespace-nowrap">
              Preview & Advance
            </button>
          </div>
        </motion.div>
      )}

      {/* Transition history */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Transition History</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : transitions.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No transitions recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">From</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">To</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 w-24">Advanced</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 w-24">Graduated</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">By</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 w-28">When</th>
              </tr>
            </thead>
            <tbody>
              {transitions.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 text-xs text-gray-600 capitalize">{t.fromSession} · {t.fromSemester}</td>
                  <td className="px-5 py-3 text-xs font-semibold text-brand-700 capitalize">{t.toSession} · {t.toSemester}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{t.studentsAdvanced}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">{t.studentsGraduated}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-600">{t.initiatedByName}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{new Date(t.initiatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
