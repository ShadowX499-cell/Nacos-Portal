import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Users, Clock, TrendingUp, BookOpen, Vote, Fingerprint,
  AlertTriangle, ArrowRight,
} from 'lucide-react';
import { adminApi, extractApiError } from '../../api/client';
import type { DashboardStats } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const ACTIVITY_ICONS: Record<string, string> = {
  registered:       '👤',
  activated:        '✅',
  payment:          '💳',
  result_published: '📋',
};

// ── Revenue Bar Chart (SVG) ───────────────────────────────────────────────────

function RevenueBarChart({ data }: { data: { month: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const H = 110, BAR_W = 34, GAP = 10;
  const totalW = data.length * (BAR_W + GAP) - GAP;
  const W = Math.max(totalW + 20, 300);
  const offsetX = (W - totalW) / 2;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full" style={{ minWidth: 260 }}>
        {[0.25, 0.5, 0.75, 1].map((pct) => (
          <line key={pct} x1={0} y1={H - pct * H} x2={W} y2={H - pct * H}
            stroke="#f3f4f6" strokeWidth="1" />
        ))}
        {data.map((d, i) => {
          const barH = Math.max((d.total / max) * H, d.total > 0 ? 4 : 0);
          const x = offsetX + i * (BAR_W + GAP);
          return (
            <g key={d.month}>
              <rect x={x} y={H - barH} width={BAR_W} height={barH}
                fill="#16a34a" rx="4" opacity="0.9" />
              {barH > 14 && (
                <text x={x + BAR_W / 2} y={H - barH + 11}
                  textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
                  {d.total >= 1000 ? `${(d.total / 1000).toFixed(0)}k` : String(d.total)}
                </text>
              )}
              <text x={x + BAR_W / 2} y={H + 16}
                textAnchor="middle" fill="#9ca3af" fontSize="9">
                {d.month}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Students-by-Level Donut (CSS conic-gradient) ─────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  L100: '#2563eb', L200: '#7c3aed', L300: '#16a34a', L400: '#d97706',
};

function LevelDonut({ data }: { data: { level: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-28 gap-2">
        <div className="text-2xl">📊</div>
        <p className="text-xs text-gray-400">No students yet</p>
      </div>
    );
  }
  let cumul = 0;
  const stops = data.map((d) => {
    const pct = (d.count / total) * 100;
    const stop = `${LEVEL_COLORS[d.level] ?? '#e5e7eb'} ${cumul.toFixed(1)}% ${(cumul + pct).toFixed(1)}%`;
    cumul += pct;
    return stop;
  }).join(', ');

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0" style={{ width: 90, height: 90 }}>
        <div className="w-full h-full rounded-full"
          style={{ background: `conic-gradient(${stops})` }} />
        <div className="absolute inset-[20px] rounded-full bg-white flex items-center justify-center shadow-inner">
          <span className="text-xs font-bold text-gray-700">{total}</span>
        </div>
      </div>
      <div className="space-y-1.5 flex-1">
        {data.map((d) => (
          <div key={d.level} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: LEVEL_COLORS[d.level] ?? '#e5e7eb' }} />
            <span className="text-xs text-gray-600">{d.level.replace('L', '')} Level</span>
            <span className="text-xs font-bold text-gray-900 ml-auto">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Students-by-Program Donut ─────────────────────────────────────────────────

const PROGRAM_COLORS: Record<string, string> = {
  CSC: '#2563eb', ICT: '#16a34a', CRE: '#d97706',
};

function ProgramDonut({ data }: { data: { program: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-20 gap-2">
        <p className="text-xs text-gray-400">No students yet</p>
      </div>
    );
  }
  let cumul = 0;
  const stops = data.map((d) => {
    const pct = (d.count / total) * 100;
    const stop = `${PROGRAM_COLORS[d.program] ?? '#e5e7eb'} ${cumul.toFixed(1)}% ${(cumul + pct).toFixed(1)}%`;
    cumul += pct;
    return stop;
  }).join(', ');

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
        <div className="w-full h-full rounded-full"
          style={{ background: `conic-gradient(${stops})` }} />
        <div className="absolute inset-[16px] rounded-full bg-white flex items-center justify-center shadow-inner">
          <span className="text-[10px] font-bold text-gray-700">{total}</span>
        </div>
      </div>
      <div className="space-y-1.5 flex-1">
        {data.map((d) => (
          <div key={d.program} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: PROGRAM_COLORS[d.program] ?? '#e5e7eb' }} />
            <span className="text-xs text-gray-600">{d.program}</span>
            <span className="text-xs font-bold text-gray-900 ml-auto">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Payment Compliance Mini Donut ─────────────────────────────────────────────

function PaymentDonut({ paid, unpaid }: { paid: number; unpaid: number }) {
  const total = paid + unpaid;
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-16 gap-1">
        <p className="text-xs text-gray-400">No data</p>
      </div>
    );
  }
  const pct = (paid / total) * 100;
  const gradient = `conic-gradient(#16a34a 0% ${pct.toFixed(1)}%, #e5e7eb ${pct.toFixed(1)}% 100%)`;
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <div className="w-full h-full rounded-full" style={{ background: gradient }} />
      <div className="absolute inset-[14px] rounded-full bg-white flex items-center justify-center shadow-inner">
        <span className="text-[9px] font-bold text-gray-700">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

// ── KPI card config ───────────────────────────────────────────────────────────

function buildCards(s: DashboardStats) {
  return [
    {
      label: 'Total Students',
      value: String(s.totalStudents),
      icon: Users,
      iconBg: 'bg-blue-600',
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      href: '/admin/users',
      urgent: false,
    },
    {
      label: 'Pending Activations',
      value: String(s.pendingValidations),
      icon: Clock,
      iconBg: s.pendingValidations > 0 ? 'bg-orange-500' : 'bg-gray-400',
      border: s.pendingValidations > 0 ? 'border-orange-300' : 'border-gray-200',
      bg: s.pendingValidations > 0 ? 'bg-orange-50' : 'bg-gray-50',
      text: s.pendingValidations > 0 ? 'text-orange-700' : 'text-gray-600',
      href: '/admin/users?status=pending',
      urgent: s.pendingValidations > 0,
    },
    {
      label: 'Total Revenue',
      value: `₦${s.totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      iconBg: 'bg-brand-600',
      border: 'border-brand-200',
      bg: 'bg-brand-50',
      text: 'text-brand-700',
      href: '/admin/revenue',
      urgent: false,
    },
    {
      label: 'Published Results',
      value: String(s.publishedGradebooks),
      icon: BookOpen,
      iconBg: 'bg-purple-600',
      border: 'border-purple-200',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      href: '/admin/gradebooks',
      urgent: false,
    },
    {
      label: 'Active Elections',
      value: String(s.activeElections),
      icon: Vote,
      iconBg: 'bg-teal-600',
      border: 'border-teal-200',
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      href: '/admin/elections',
      urgent: false,
    },
    {
      label: "Today's Sessions",
      value: String(s.todayAttendanceSessions),
      icon: Fingerprint,
      iconBg: 'bg-indigo-600',
      border: 'border-indigo-200',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      href: '/admin/attendance',
      urgent: false,
    },
  ] satisfies { label: string; value: string; icon: React.ElementType; iconBg: string; border: string; bg: string; text: string; href: string | null; urgent: boolean }[];
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    adminApi.getDashboard()
      .then((res) => setStats(res.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
          <p className="text-sm text-gray-400">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  // Alert conditions
  const allAlerts: { id: string; type: 'warning' | 'info'; message: string; href: string }[] = [];
  if (stats.pendingValidations > 0)
    allAlerts.push({ id: 'pending', type: 'warning', message: `${stats.pendingValidations} student${stats.pendingValidations > 1 ? 's' : ''} awaiting activation`, href: '/admin/users?status=pending' });
  if (stats.draftGradebooksReady > 0)
    allAlerts.push({ id: 'drafts', type: 'warning', message: `${stats.draftGradebooksReady} gradebook${stats.draftGradebooksReady > 1 ? 's' : ''} ready to publish`, href: '/admin/gradebooks' });
  if (stats.activeElections === 0)
    allAlerts.push({ id: 'no-election', type: 'info', message: 'No active election is currently running', href: '/admin/elections' });

  const visibleAlerts = allAlerts.filter((a) => !dismissedAlerts.has(a.id));
  const cards = buildCards(stats);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link
          to="/admin/users/new"
          className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          + Add Student
        </Link>
      </div>

      {/* Alert strip */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-2">
          {visibleAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 border text-sm ${
                alert.type === 'warning'
                  ? 'bg-orange-50 border-orange-200 text-orange-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-xs sm:text-sm">{alert.message}</span>
              <Link to={alert.href} className="text-xs font-bold underline flex items-center gap-0.5 flex-shrink-0">
                View <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                onClick={() => setDismissedAlerts((prev) => new Set([...prev, alert.id]))}
                className="ml-1 text-lg leading-none opacity-50 hover:opacity-100"
              >×</button>
            </motion.div>
          ))}
        </div>
      )}

      {/* KPI cards — 2 cols mobile, 3 cols sm, 6 cols xl */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((card, i) => {
          const cardContent = (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`relative bg-white rounded-2xl border-2 p-4 shadow-sm hover:shadow-md transition-all ${card.bg} ${card.border} ${card.href ? 'hover:-translate-y-0.5 cursor-pointer' : ''}`}
            >
              {card.urgent && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              )}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.iconBg}`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl font-black text-gray-900 leading-none mb-1">{card.value}</div>
              <div className={`text-xs font-semibold leading-tight ${card.text}`}>{card.label}</div>
            </motion.div>
          );
          return card.href
            ? <Link key={card.label} to={card.href}>{cardContent}</Link>
            : <div key={card.label}>{cardContent}</div>;
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

        {/* Revenue bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-3 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Revenue (6 months)</h2>
              <p className="text-xs text-gray-400 mt-0.5">Successful Paystack payments</p>
            </div>
            <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-1 rounded-lg">
              ₦{stats.totalRevenue.toLocaleString()} total
            </span>
          </div>
          <RevenueBarChart data={stats.monthlyRevenue} />
        </motion.div>

        {/* Students by level + program donuts */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-5"
        >
          <div>
            <h2 className="text-sm font-bold text-gray-900">Students by Level</h2>
            <p className="text-xs text-gray-400 mt-0.5">Current enrollment breakdown</p>
            <div className="mt-3"><LevelDonut data={stats.studentsByLevel} /></div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <h2 className="text-sm font-bold text-gray-900">Students by Program</h2>
            <p className="text-xs text-gray-400 mt-0.5">CSC · ICT · CRE distribution</p>
            <div className="mt-3"><ProgramDonut data={stats.studentsByProgram ?? []} /></div>
          </div>
        </motion.div>
      </div>

      {/* Payment Compliance */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
        className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Payment Compliance</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Session: {stats.nacosPaymentStats.session}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* NACOS Dues panel */}
          <Link
            to={`/admin/payments/nacos-dues?session=${encodeURIComponent(stats.nacosPaymentStats.session)}`}
            className="flex items-center gap-4 p-4 rounded-xl border-l-4 border-amber-400 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            <PaymentDonut paid={stats.nacosPaymentStats.paid} unpaid={stats.nacosPaymentStats.unpaid} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 mb-1">NACOS Dues</p>
              <p className="text-xs text-green-700 font-semibold">
                {stats.nacosPaymentStats.paid} paid
              </p>
              <p className="text-xs text-red-600 font-semibold">
                {stats.nacosPaymentStats.unpaid} unpaid
              </p>
              <p className="text-[10px] text-gray-400 mt-1">Click to view full list →</p>
            </div>
          </Link>

          {/* Result Sub panel */}
          <Link
            to={`/admin/payments/result-sub?session=${encodeURIComponent(stats.resultSubStats.session)}&semester=${encodeURIComponent(stats.resultSubStats.semester)}`}
            className="flex items-center gap-4 p-4 rounded-xl border-l-4 border-blue-400 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <PaymentDonut paid={stats.resultSubStats.paid} unpaid={stats.resultSubStats.unpaid} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 mb-1">Result Subscription</p>
              <p className="text-xs text-green-700 font-semibold">
                {stats.resultSubStats.paid} paid
              </p>
              <p className="text-xs text-red-600 font-semibold">
                {stats.resultSubStats.unpaid} unpaid
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                {stats.resultSubStats.semester !== '—' ? `${stats.resultSubStats.semester} semester · ` : ''}Click to view →
              </p>
            </div>
          </Link>

        </div>
      </motion.div>

      {/* Activity + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Recent Activity</h2>
            <span className="text-[10px] text-gray-400">{stats.recentActivity.length} events</span>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentActivity.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="text-2xl mb-2">📭</div>
                <p className="text-sm text-gray-500">No activity yet</p>
              </div>
            ) : (
              stats.recentActivity.map((event, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {ACTIVITY_ICONS[event.type] ?? '📌'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{event.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                        {timeAgo(event.time)} · {formatDate(event.time)}
                      </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <Link
              to="/admin/activity"
              className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1"
            >
              View All Activity <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"
        >
          <h2 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '👤', label: 'Add Student',   href: '/admin/users/new',  live: true  },
              { icon: '📋', label: 'View Students', href: '/admin/users',       live: true  },
              { icon: '📚', label: 'Gradebooks',    href: '/admin/gradebooks', live: true  },
              { icon: '📝', label: 'Grade Entry',   href: '/admin/gradebooks', live: true  },
              { icon: '🗳️', label: 'Elections',     href: '/admin/elections',  live: false },
              { icon: '🖐️', label: 'Attendance',    href: '/admin/attendance', live: false },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${
                  action.live
                    ? 'border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 hover:text-brand-800'
                    : 'border-gray-100 bg-gray-50 text-gray-400 pointer-events-none'
                }`}
              >
                <span className="text-xl leading-none">{action.icon}</span>
                <span className="font-medium text-xs truncate">{action.label}</span>
                {!action.live && (
                  <span className="ml-auto text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">Soon</span>
                )}
              </Link>
            ))}
          </div>

          {/* Summary strip */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Students',   value: String(stats.totalStudents) },
              { label: 'Gradebooks', value: String(stats.publishedGradebooks) },
              { label: 'Revenue',    value: `₦${stats.totalRevenue >= 1000 ? `${(stats.totalRevenue / 1000).toFixed(0)}k` : stats.totalRevenue}` },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-lg font-black text-gray-900">{s.value}</div>
                <div className="text-[10px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
