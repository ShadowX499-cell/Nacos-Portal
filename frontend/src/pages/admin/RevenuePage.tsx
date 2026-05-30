import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Download, Filter } from 'lucide-react';
import { revenueApi, type RevenueSummary, extractApiError } from '../../api/client';

// ── Bar chart (reuse same SVG pattern as dashboard) ───────────────────────────

function MiniBarChart({ data }: { data: { month: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const H = 90, BAR_W = 32, GAP = 8;
  const totalW = data.length * (BAR_W + GAP) - GAP;
  const W = Math.max(totalW + 20, 260);
  const offsetX = (W - totalW) / 2;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" style={{ minWidth: 240 }}>
        {[0.25, 0.5, 0.75, 1].map((pct) => (
          <line key={pct} x1={0} y1={H - pct * H} x2={W} y2={H - pct * H} stroke="#f3f4f6" strokeWidth="1" />
        ))}
        {data.map((d, i) => {
          const barH = Math.max((d.total / max) * H, d.total > 0 ? 4 : 0);
          const x = offsetX + i * (BAR_W + GAP);
          return (
            <g key={d.month}>
              <rect x={x} y={H - barH} width={BAR_W} height={barH} fill="#16a34a" rx="3" opacity="0.85" />
              {barH > 14 && (
                <text x={x + BAR_W / 2} y={H - barH + 10} textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">
                  {d.total >= 1000 ? `${(d.total / 1000).toFixed(0)}k` : String(d.total)}
                </text>
              )}
              <text x={x + BAR_W / 2} y={H + 14} textAnchor="middle" fill="#9ca3af" fontSize="8">{d.month}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Mini donut ────────────────────────────────────────────────────────────────

const COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#d97706', '#ea580c'];

function MiniDonut({ data }: { data: { label: string; amount: number }[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  if (total === 0) return <p className="text-xs text-gray-400 py-4 text-center">No data</p>;
  let cumul = 0;
  const stops = data.map((d, i) => {
    const pct = (d.amount / total) * 100;
    const stop = `${COLORS[i % COLORS.length]} ${cumul.toFixed(1)}% ${(cumul + pct).toFixed(1)}%`;
    cumul += pct;
    return stop;
  }).join(', ');
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
        <div className="w-full h-full rounded-full" style={{ background: `conic-gradient(${stops})` }} />
        <div className="absolute inset-4 rounded-full bg-white shadow-inner" />
      </div>
      <div className="space-y-1.5 flex-1 min-w-0">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-xs text-gray-600 truncate flex-1">{d.label}</span>
            <span className="text-xs font-bold text-gray-900 flex-shrink-0">₦{d.amount >= 1000 ? `${(d.amount / 1000).toFixed(0)}k` : d.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  nacos_dues: 'NACOS Dues', school_fees: 'School Fees',
  result_subscription: 'Result Sub.', other: 'Other',
};

export default function RevenuePage() {
  const [data, setData] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [session, setSession] = useState('');
  const [semester, setSemester] = useState('');
  const [program, setProgram] = useState('');
  const [type, setType] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 25 };
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (session) params.session = session;
    if (semester) params.semester = semester;
    if (program) params.program = program;
    if (type) params.type = type;

    revenueApi.getSummary(params)
      .then((r) => setData(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [page, dateFrom, dateTo, session, semester, program, type]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [dateFrom, dateTo, session, semester, program, type]);

  const clearFilters = () => {
    setDateFrom(''); setDateTo(''); setSession('');
    setSemester(''); setProgram(''); setType(''); setPage(1);
  };

  const handleExport = () => {
    const params: Record<string, string> = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (session) params.session = session;
    if (type) params.type = type;
    revenueApi.exportCsv(params);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Department payment insights</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 btn-secondary btn-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input w-36" placeholder="From" />
        <span className="text-gray-400">→</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input w-36" placeholder="To" />
        <input type="text" placeholder="Session (e.g. 2024/2025)" value={session} onChange={(e) => setSession(e.target.value)} className="input w-40" />
        <select value={semester} onChange={(e) => setSemester(e.target.value)} className="input w-32">
          <option value="">All Semesters</option>
          <option value="first">First</option>
          <option value="second">Second</option>
        </select>
        <select value={program} onChange={(e) => setProgram(e.target.value)} className="input w-28">
          <option value="">All Programs</option>
          <option value="CSC">CSC</option>
          <option value="ICT">ICT</option>
          <option value="CRE">CRE</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input w-40">
          <option value="">All Types</option>
          <option value="nacos_dues">NACOS Dues</option>
          <option value="school_fees">School Fees</option>
          <option value="result_subscription">Result Sub.</option>
        </select>
        <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      {/* KPI row */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue', value: `₦${data.totalRevenue.toLocaleString()}`, color: 'text-brand-700', bg: 'bg-brand-50 border-brand-200' },
            { label: 'NACOS Dues', value: `₦${(data.byType.find((t) => t.type === 'nacos_dues')?.amount ?? 0).toLocaleString()}`, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
            { label: 'School Fees', value: `₦${(data.byType.find((t) => t.type === 'school_fees')?.amount ?? 0).toLocaleString()}`, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
            { label: 'Collection Rate', value: `${data.collectionRate}%`, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`${kpi.bg} border rounded-2xl p-4 shadow-sm`}>
              <p className="text-xs font-semibold text-gray-500 mb-1">{kpi.label}</p>
              <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts row */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="md:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Monthly Revenue (6 months)</h2>
            <MiniBarChart data={data.monthlyTrend} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">By Payment Type</h2>
            <MiniDonut data={data.byType.map((t) => ({ label: TYPE_LABELS[t.type] ?? t.type, amount: t.amount }))} />
          </motion.div>
        </div>
      )}

      {/* Payment table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Payments</h2>
          {data?.meta && <span className="text-xs text-gray-400">{data.meta.total} total</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Student</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 w-36">Type</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 w-28">Amount</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 w-28">Session</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 w-28">Paid At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : !data || data.recentPayments.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">No payments found.</td></tr>
              ) : (
                data.recentPayments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="text-xs font-semibold text-gray-900">{p.studentName}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{p.studentUserId}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[p.type] ?? p.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-bold text-gray-900">₦{p.amount.toLocaleString()}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{p.sessionYear ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
            <span>Page {data.meta.page} of {data.meta.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary btn-sm disabled:opacity-40">← Prev</button>
              <button disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary btn-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
