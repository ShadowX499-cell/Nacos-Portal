import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { profileApi, resultsApi, notificationsApi, registrationApi, paymentsApi } from '../../api/client';
import type { User, ResultListItem, Registration } from '../../types';

export default function StudentDashboard() {
  const [profile, setProfile] = useState<User | null>(null);
  const [results, setResults] = useState<ResultListItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [latestReg, setLatestReg] = useState<Registration | null>(null);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [gpa, setGpa] = useState<{ cgpa: number; totalCreditsEarned: number; semesters: unknown[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      profileApi.getMe().then((r) => setProfile(r.data.data)),
      resultsApi.list().then((r) => setResults(r.data.data)),
      resultsApi.getGpa().then((r) => setGpa(r.data.data)),
      notificationsApi.getUnreadCount().then((r) => setUnread(r.data.data.count)),
      registrationApi.list().then((r) => setLatestReg(r.data.data[0] ?? null)),
      paymentsApi.history().then((r) => setPendingPayments(r.data.data.filter((p) => p.status === 'pending').length)),
    ]).finally(() => setLoading(false));
  }, []);

  const paidResults = results.filter((r) => r.hasPaid);
  const unpaidResults = results.filter((r) => !r.hasPaid);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const actions: { icon: string; label: string; note: string; href: string; urgent?: boolean }[] = [];
  if (unpaidResults.length > 0) {
    actions.push({ icon: '💳', label: 'Pay for result', note: `${unpaidResults.length} unpaid`, href: '/student/results', urgent: true });
  }
  if (pendingPayments > 0) {
    actions.push({ icon: '⏳', label: 'Pending payment', note: 'Awaiting verification', href: '/student/payments', urgent: true });
  }
  if (paidResults.length > 0) {
    actions.push({ icon: '📋', label: `${paidResults[0].gradebookName} available`, note: 'New result published', href: `/student/results/${paidResults[0].gradebookId}` });
  }
  if (latestReg?.status === 'rejected') {
    actions.push({ icon: '📝', label: 'Registration rejected', note: latestReg.reviewNote ?? 'Please re-upload', href: '/student/registration', urgent: true });
  }
  if (unread > 0) {
    actions.push({ icon: '🔔', label: `${unread} unread notification${unread > 1 ? 's' : ''}`, note: 'View all', href: '/student/notifications' });
  }

  if (loading) return <div className="p-6 text-center text-gray-400">Loading dashboard…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {profile?.name?.split(' ')[0] ?? 'Student'} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {profile?.program ?? '—'} · {profile?.level ?? '—'} · NACOS Portal
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🎓" value={gpa?.cgpa.toFixed(2) ?? '—'} label="Cumulative GPA" color="text-brand-800" sub={gpa && gpa.cgpa > 0 ? '↑ Keep it up!' : undefined} />
        <StatCard icon="📚" value={String(gpa?.totalCreditsEarned ?? 0)} label="Credits Earned" color="text-green-700" sub={`${gpa?.semesters.length ?? 0} semesters`} />
        <StatCard icon="📅" value={profile?.level ?? '—'} label="Current Level" color="text-yellow-700" sub={profile?.program} />
        <StatCard icon="📊" value={String(gpa?.semesters.length ?? 0)} label="Semesters Done" color="text-purple-700" sub={unpaidResults.length > 0 ? `${unpaidResults.length} result pending` : undefined} />
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Recent Results */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">📋 Recent Results</h2>
            <Link to="/student/results" className="text-xs text-brand-800 font-medium hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {paidResults.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No results available yet.</p>
            ) : (
              paidResults.slice(0, 3).map((r) => (
                <div key={r.gradebookId} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.gradebookName}</p>
                    <p className="text-xs text-gray-400">{r.level} · {r.session} · <span className="capitalize">{r.semester}</span> Sem</p>
                  </div>
                  <Link to={`/student/results/${r.gradebookId}`} className="text-xs text-brand-800 font-medium hover:underline">
                    View →
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Required */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">⚡ Action Required</h2>
            {actions.some((a) => a.urgent) && (
              <span className="badge badge-yellow">{actions.filter((a) => a.urgent).length} pending</span>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {actions.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">You're all caught up! ✅</p>
            ) : (
              actions.map((action, i) => (
                <Link key={i} to={action.href} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors block">
                  <span className="text-base mt-0.5">{action.icon}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${action.urgent ? 'text-gray-900' : 'text-gray-700'}`}>{action.label}</p>
                    <p className="text-xs text-gray-400">{action.note}</p>
                  </div>
                  {action.urgent && <span className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-5 gap-3">
          {[
            { icon: '📋', label: 'My Results', to: '/student/results' },
            { icon: '🏫', label: 'School Fees', to: '/student/school-fees' },
            { icon: '📈', label: 'Transcript', to: '/student/transcript' },
            { icon: '🗳️', label: 'Elections', to: '/student/elections' },
            { icon: '👤', label: 'Profile', to: '/student/profile' },
          ].map((qa) => (
            <Link
              key={qa.to}
              to={qa.to}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-blue-50 transition-all text-center"
            >
              <span className="text-xl">{qa.icon}</span>
              <span className="text-xs font-medium text-gray-700 leading-tight">{qa.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color, sub }: {
  icon: string; value: string; label: string; color: string; sub?: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
