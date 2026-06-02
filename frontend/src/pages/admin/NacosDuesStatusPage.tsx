import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { paymentStatusApi, extractApiError } from '../../api/client';
import type { PaymentStatusStudent, PaginationMeta } from '../../types';

export default function NacosDuesStatusPage() {
  const [searchParams] = useSearchParams();

  const [items, setItems]     = useState<PaymentStatusStudent[]>([]);
  const [meta, setMeta]       = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [program,  setProgram]  = useState(searchParams.get('program')  ?? '');
  const [level,    setLevel]    = useState(searchParams.get('level')    ?? '');
  const [session,  setSession]  = useState(searchParams.get('session')  ?? '');
  const [status,   setStatus]   = useState(searchParams.get('status')   ?? '');
  const [page,     setPage]     = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 20 };
    if (program) params.program  = program;
    if (level)   params.level    = level;
    if (session) params.session  = session;
    if (status)  params.status   = status;

    paymentStatusApi.getNacosStudents(params)
      .then((r) => {
        setItems(r.data.data);
        setMeta(r.data.meta ?? null);
      })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [page, program, level, session, status]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    const params: Record<string, string> = {};
    if (program) params.program  = program;
    if (level)   params.level    = level;
    if (session) params.session  = session;
    if (status)  params.status   = status;
    paymentStatusApi.exportNacosPdf(params);
  };

  const resetFilters = () => {
    setProgram(''); setLevel(''); setStatus(''); setPage(1);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard" className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">NACOS Dues</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {session ? `Session: ${session}` : 'Payment status by student'}
              {meta ? ` · ${meta.total} students` : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 bg-white border border-gray-200 rounded-2xl p-4">
        <select value={program} onChange={(e) => { setProgram(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Programs</option>
          <option value="CSC">CSC</option>
          <option value="ICT">ICT</option>
          <option value="CRE">CRE</option>
        </select>
        <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Levels</option>
          <option value="L100">100 Level</option>
          <option value="L200">200 Level</option>
          <option value="L300">300 Level</option>
          <option value="L400">400 Level</option>
        </select>
        <input
          value={session}
          onChange={(e) => { setSession(e.target.value); setPage(1); }}
          placeholder="Session (e.g. 2024/2025)"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-44"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
        {(program || level || status) && (
          <button onClick={resetFilters}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl border border-gray-200 bg-white">
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Column headers */}
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_0.7fr_0.7fr_0.9fr_1.2fr] gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
          <span>Student</span><span>Student ID</span><span>Program</span><span>Level</span><span>Status</span><span>Paid Date</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">No students found</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((s) => (
              <div key={s.id} className="grid grid-cols-[2fr_1.5fr_0.7fr_0.7fr_0.9fr_1.2fr] gap-3 items-center px-5 py-3">
                <span className="text-sm font-medium text-gray-900 truncate">{s.name}</span>
                <span className="text-xs text-gray-500 font-mono truncate">{s.userId}</span>
                <span className="text-xs text-gray-600">{s.program}</span>
                <span className="text-xs text-gray-600">{s.level.replace('L', '')}L</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${
                  s.hasPaid
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {s.hasPaid ? 'Paid' : 'Unpaid'}
                </span>
                <span className="text-xs text-gray-500">
                  {s.paidAt ? new Date(s.paidAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="text-sm font-medium text-brand-700 disabled:text-gray-300 hover:text-brand-900 px-3 py-1.5 rounded-lg hover:bg-brand-50 disabled:bg-transparent transition-colors">
            ← Prev
          </button>
          <span className="text-xs text-gray-500">Page {page} of {meta.totalPages} · {meta.total} students</span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
            className="text-sm font-medium text-brand-700 disabled:text-gray-300 hover:text-brand-900 px-3 py-1.5 rounded-lg hover:bg-brand-50 disabled:bg-transparent transition-colors">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
