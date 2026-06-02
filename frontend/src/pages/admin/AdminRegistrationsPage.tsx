import { useEffect, useState } from 'react';
import { adminRegistrationApi, extractApiError } from '../../api/client';
import type { AdminRegistration } from '../../types';
import { ExternalLink, CheckCircle, XCircle, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-800 border-yellow-200',
  verified: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};
const STATUS_ICONS: Record<string, string> = { pending: '⏳', verified: '✅', rejected: '❌' };

// ── Review modal ──────────────────────────────────────────────────────────────
function ReviewModal({
  item,
  action,
  onClose,
  onConfirm,
}: {
  item: AdminRegistration;
  action: 'verified' | 'rejected';
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    setSaving(true);
    await onConfirm(note);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className={`px-5 py-4 ${action === 'verified' ? 'bg-green-50 border-b border-green-100' : 'bg-red-50 border-b border-red-100'}`}>
          <p className={`font-bold text-sm ${action === 'verified' ? 'text-green-800' : 'text-red-800'}`}>
            {action === 'verified' ? '✅ Approve submission' : '❌ Reject submission'}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            {item.studentName} — {item.session} {item.semester} semester
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {action === 'rejected' ? 'Rejection reason (required)' : 'Note for student (optional)'}
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={action === 'rejected' ? 'e.g. Incorrect session year, unclear scan…' : 'e.g. Approved for 2024/2025 first semester'}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => void handle()}
              disabled={saving || (action === 'rejected' && !note.trim())}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 ${
                action === 'verified' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Saving…
                </span>
              ) : action === 'verified' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const TABS = [
  { value: 'course_form',        label: 'Course Forms',        color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'school_fee_receipt', label: 'School Fee Receipts', color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminRegistrationsPage() {
  const [items, setItems] = useState<AdminRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'course_form' | 'school_fee_receipt'>('course_form');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ item: AdminRegistration; action: 'verified' | 'rejected' } | null>(null);

  const fetchItems = (tab: string, status: string, session: string, semester: string) => {
    setLoading(true);
    setError('');
    adminRegistrationApi
      .list({
        type: tab,
        status:   status   || undefined,
        session:  session  || undefined,
        semester: semester || undefined,
      })
      .then((r) => setItems(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  };

  // Re-fetch whenever tab changes, resetting filters
  useEffect(() => {
    setFilterStatus('');
    setFilterSession('');
    setFilterSemester('');
    setExpandedId(null);
    fetchItems(activeTab, '', '', '');
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTab = (tab: 'course_form' | 'school_fee_receipt') => setActiveTab(tab);

  const applyFilters = () => fetchItems(activeTab, filterStatus, filterSession, filterSemester);

  const handleReview = async (note: string) => {
    if (!modal) return;
    try {
      const res = await adminRegistrationApi.review(modal.item.id, modal.action, note || undefined);
      setItems((prev) => prev.map((r) => r.id === modal.item.id ? res.data.data : r));
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setModal(null);
    }
  };

  const pending = items.filter((r) => r.status === 'pending');
  const others  = items.filter((r) => r.status !== 'pending');
  const sorted  = [...pending, ...others];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {modal && (
        <ReviewModal
          item={modal.item}
          action={modal.action}
          onClose={() => setModal(null)}
          onConfirm={handleReview}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registrations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review course form uploads submitted by students</p>
        </div>
        {pending.length > 0 && (
          <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1.5 rounded-full border border-yellow-200">
            {pending.length} pending review
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => switchTab(tab.value as 'course_form' | 'school_fee_receipt')}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
              activeTab === tab.value
                ? tab.color
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Filters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <input
            type="text"
            placeholder="Session (e.g. 2024/2025)"
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All semesters</option>
            <option value="first">First</option>
            <option value="second">Second</option>
          </select>
          <button
            onClick={applyFilters}
            className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold py-2 px-4 rounded-xl transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">
            {activeTab === 'course_form' ? '📋 Course Form Submissions' : '🏫 School Fee Receipt Submissions'}
          </p>
          <span className="text-xs text-gray-400">{items.length} total</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400">
            <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-brand-600 animate-spin mx-auto mb-3" />
            Loading…
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm font-medium text-gray-700">No submissions found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sorted.map((item) => (
              <div key={item.id}>
                {/* Row */}
                <div
                  className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer ${
                    item.status === 'pending' ? 'bg-yellow-50/40' : ''
                  }`}
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                >
                  {/* Student */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.studentName}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{item.studentUserId}</p>
                  </div>

                  {/* Session / Semester */}
                  <div className="hidden sm:block text-center flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-700">{item.session}</p>
                    <p className="text-[11px] text-gray-400 capitalize">{item.semester} sem</p>
                  </div>

                  {/* Submitted date */}
                  <div className="hidden md:block text-xs text-gray-400 flex-shrink-0 w-24 text-right">
                    {new Date(item.submittedAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                  </div>

                  {/* Status badge */}
                  <span className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLES[item.status]}`}>
                    {STATUS_ICONS[item.status]} <span className="capitalize">{item.status}</span>
                  </span>

                  {/* Expand toggle */}
                  <div className="flex-shrink-0 text-gray-400">
                    {expandedId === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expandedId === item.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 pt-2 bg-gray-50 border-t border-gray-100 space-y-3">
                        {/* Info grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: 'Student', value: item.studentName },
                            { label: 'Student ID', value: item.studentUserId },
                            { label: 'Session', value: item.session },
                            { label: 'Semester', value: item.semester.charAt(0).toUpperCase() + item.semester.slice(1) },
                            { label: 'Submitted', value: new Date(item.submittedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) },
                            { label: 'Status', value: item.status.charAt(0).toUpperCase() + item.status.slice(1) },
                            ...(item.reviewedAt ? [{ label: 'Reviewed', value: new Date(item.reviewedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) }] : []),
                          ].map((f) => (
                            <div key={f.label} className="bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{f.label}</p>
                              <p className="text-xs font-semibold text-gray-800 mt-0.5 capitalize">{f.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Review note */}
                        {item.reviewNote && (
                          <div className={`rounded-xl px-4 py-3 text-sm border ${item.status === 'rejected' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
                            <span className="font-semibold">Review note:</span> {item.reviewNote}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.fileUrl && (
                            <a
                              href={item.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 border border-brand-200 hover:bg-brand-50 px-3 py-2 rounded-xl transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View uploaded form
                            </a>
                          )}
                          {item.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setModal({ item, action: 'verified' })}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-2 rounded-xl transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => setModal({ item, action: 'rejected' })}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-2 rounded-xl transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          )}
                          {item.status === 'verified' && (
                            <button
                              onClick={() => setModal({ item, action: 'rejected' })}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Revoke
                            </button>
                          )}
                          {item.status === 'rejected' && (
                            <button
                              onClick={() => setModal({ item, action: 'verified' })}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 border border-green-200 hover:bg-green-50 px-3 py-2 rounded-xl transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approve instead
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
