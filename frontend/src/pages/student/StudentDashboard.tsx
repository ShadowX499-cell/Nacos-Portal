import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, MapPin, ArrowRight, BookOpen, FileText, Bell, X, Clock, Users } from 'lucide-react';
import { profileApi, resultsApi, notificationsApi, registrationApi, paymentsApi } from '../../api/client';
import type { User, ResultListItem, Registration, GpaSummary, StudentResultView } from '../../types';

// ── Upcoming events (static — will be from API in Phase 3) ───────────────────

interface EventItem {
  date: { month: string; day: string };
  title: string;
  location: string;
  tag: string;
  time: string;
  description: string;
  organizer: string;
}

const UPCOMING_EVENTS: EventItem[] = [
  {
    date: { month: 'JUN', day: '14' },
    title: 'NACOS Week 2025 Kick-off',
    location: 'Main Auditorium',
    tag: 'Free',
    time: '10:00 AM',
    description: 'The official opening ceremony of NACOS Week 2025. All students are welcome to attend the keynote address, departmental parade, and cultural performances. Refreshments will be provided.',
    organizer: 'NACOS Executive Council',
  },
  {
    date: { month: 'JUN', day: '21' },
    title: 'Tech Showcase & Exhibition',
    location: 'CS Department',
    tag: 'Free',
    time: '9:00 AM – 4:00 PM',
    description: 'Students showcase their semester projects and innovations. Industry judges from top Nigerian tech companies will be in attendance. Top 3 projects win cash prizes and internship placements.',
    organizer: 'NACOS Tech Committee',
  },
  {
    date: { month: 'JUL', day: '05' },
    title: 'Executive Elections 2025',
    location: 'University Hall',
    tag: 'Members',
    time: '8:00 AM – 5:00 PM',
    description: 'Cast your vote for the next NACOS executive team. Voting is open to all paid-up NACOS members. Bring your student ID and ensure your NACOS Due is cleared before the election date.',
    organizer: 'NACOS Electoral Committee',
  },
];

// ── Event Detail Modal ────────────────────────────────────────────────────────

function EventModal({ event, onClose }: { event: EventItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Banner */}
        <div className="relative px-5 py-5" style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)' }}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="flex items-start gap-4">
            <div className="text-center bg-white/15 border border-white/20 rounded-xl px-3 py-2 flex-shrink-0 min-w-[52px]">
              <div className="text-[9px] font-bold text-brand-300 uppercase tracking-wide">{event.date.month}</div>
              <div className="font-black text-white text-2xl leading-none">{event.date.day}</div>
            </div>
            <div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 inline-block ${
                event.tag === 'Free' ? 'bg-brand-400/30 text-brand-200' : 'bg-blue-400/30 text-blue-200'
              }`}>{event.tag}</span>
              <h3 className="text-white font-bold text-base leading-tight">{event.title}</h3>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <MapPin className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <div>
                <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Venue</p>
                <p className="text-xs font-semibold text-gray-800">{event.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <Clock className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <div>
                <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Time</p>
                <p className="text-xs font-semibold text-gray-800">{event.time}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
            <Users className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <div>
              <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Organizer</p>
              <p className="text-xs font-semibold text-gray-800">{event.organizer}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-700 mb-1.5">About this event</p>
            <p className="text-xs text-gray-600 leading-relaxed">{event.description}</p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            Got it
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── SGPA Trend Chart (SVG) ────────────────────────────────────────────────────

function SGPATrendChart({ semesters }: { semesters: GpaSummary['semesters'] }) {
  const sorted = [...semesters].sort((a, b) => a.session.localeCompare(b.session));
  if (sorted.length < 2) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-gray-400 py-6">
        Need at least 2 semesters for trend
      </div>
    );
  }

  const W = 280, H = 90, PAD = 12;
  const max = 5.0;
  const pts = sorted.map((s, i) => ({
    x: PAD + (i / (sorted.length - 1)) * (W - PAD * 2),
    y: H - PAD - (s.sgpa / max) * (H - PAD * 2),
    sgpa: s.sgpa,
    label: `${s.session.split('/')[0]} ${s.semester === 'first' ? 'S1' : 'S2'}`,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${H - PAD} L ${pts[0].x} ${H - PAD} Z`;

  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const trending = last.sgpa >= prev.sgpa;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-700">SGPA Trend</p>
        <div className={`flex items-center gap-1 text-xs font-bold ${trending ? 'text-brand-600' : 'text-red-500'}`}>
          {trending ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {last.sgpa.toFixed(2)}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[1, 2, 3, 4, 5].map((v) => {
          const y = H - PAD - (v / max) * (H - PAD * 2);
          return (
            <line key={v} x1={PAD} y1={y} x2={W - PAD} y2={y}
              stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 3" />
          );
        })}
        {/* Area */}
        <path d={areaD} fill="url(#areaGrad)" />
        {/* Line */}
        <path d={pathD} stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {/* Points */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#16a34a" stroke="white" strokeWidth="1.5" />
          </g>
        ))}
      </svg>
      {/* X-axis labels */}
      <div className="flex justify-between mt-1 px-3">
        {pts.map((p, i) => (
          <span key={i} className="text-[9px] text-gray-400">{p.label}</span>
        ))}
      </div>
    </div>
  );
}

// ── Grade Pie Chart (CSS conic-gradient) — shows credits earned per grade ─────

const GRADE_COLORS: Record<string, string> = {
  A: '#16a34a', B: '#2563eb', C: '#7c3aed', D: '#d97706', E: '#ea580c', F: '#dc2626',
};

// Demo distribution used when there's no real data yet
const DEMO_SLICES = [
  { label: 'A', pct: 35, color: GRADE_COLORS.A },
  { label: 'B', pct: 30, color: GRADE_COLORS.B },
  { label: 'C', pct: 20, color: GRADE_COLORS.C },
  { label: 'D', pct: 10, color: GRADE_COLORS.D },
  { label: 'F', pct: 5,  color: GRADE_COLORS.F },
];

function GradePieChart({ gpa }: { gpa: GpaSummary | null }) {
  // Build grade distribution from semesters if available
  const hasData = gpa && gpa.semesters.length > 0;

  const slices = hasData ? DEMO_SLICES : DEMO_SLICES; // Phase 2: replace with real grade counts

  let cumul = 0;
  const stops = slices.map((s) => {
    const stop = `${s.color} ${cumul.toFixed(1)}% ${(cumul + s.pct).toFixed(1)}%`;
    cumul += s.pct;
    return stop;
  }).join(', ');

  return (
    <div className="flex items-center gap-5">
      {/* Donut */}
      <div className="relative flex-shrink-0" style={{ width: 90, height: 90 }}>
        <div
          className="w-full h-full rounded-full"
          style={{ background: `conic-gradient(${stops})` }}
        />
        <div className="absolute inset-[20px] rounded-full bg-white flex items-center justify-center shadow-inner">
          <span className="text-[10px] font-bold text-gray-600 leading-tight text-center">Grade<br/>Mix</span>
        </div>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 flex-1">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-gray-600">Grade {s.label}</span>
            <span className="text-xs font-bold text-gray-900 ml-auto">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Profile Avatar ────────────────────────────────────────────────────────────

function ProfileAvatar({ user, size = 'lg' }: { user: User | null; size?: 'sm' | 'lg' }) {
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'ST';
  const sz = size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-10 h-10 text-sm';
  return (
    <div
      className={`${sz} rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg`}
      style={{ background: 'linear-gradient(135deg, #16a34a 0%, #052e16 100%)' }}
    >
      {initials}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const [profile, setProfile] = useState<User | null>(null);
  const [results, setResults] = useState<ResultListItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [latestReg, setLatestReg] = useState<Registration | null>(null);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [gpa, setGpa] = useState<GpaSummary | null>(null);
  const [resultCache, setResultCache] = useState<Map<string, StudentResultView>>(new Map());
  const [activeSemGbId, setActiveSemGbId] = useState<string | null>(null);
  const [loadingSem, setLoadingSem] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    Promise.allSettled([
      profileApi.getMe().then((r) => setProfile(r.data.data)),
      resultsApi.list().then((r) => setResults(r.data.data)),
      resultsApi.getGpa().then(async (r) => {
        const g = r.data.data;
        setGpa(g);
        if (g.semesters.length > 0) {
          const latest = [...g.semesters].sort((a, b) =>
            b.session.localeCompare(a.session) || b.semester.localeCompare(a.semester)
          )[0];
          setActiveSemGbId(latest.gradebookId);
          const rr = await resultsApi.get(latest.gradebookId);
          setResultCache(new Map([[latest.gradebookId, rr.data.data]]));
        }
      }),
      notificationsApi.getUnreadCount().then((r) => setUnread(r.data.data.count)),
      registrationApi.list().then((r) => setLatestReg(r.data.data[0] ?? null)),
      paymentsApi.history().then((r) =>
        setPendingPayments(r.data.data.filter((p) => p.status === 'pending').length)
      ),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSelectSem = async (gbId: string) => {
    setActiveSemGbId(gbId);
    if (!resultCache.has(gbId)) {
      setLoadingSem(true);
      try {
        const rr = await resultsApi.get(gbId);
        setResultCache((prev) => new Map(prev).set(gbId, rr.data.data));
      } finally {
        setLoadingSem(false);
      }
    }
  };

  const activeResult = activeSemGbId ? resultCache.get(activeSemGbId) ?? null : null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const paidResults = results.filter((r) => r.hasPaid);
  const unpaidResults = results.filter((r) => !r.hasPaid);

  // Action items
  const actions: { icon: string; label: string; note: string; href: string; urgent: boolean }[] = [];
  if (unpaidResults.length > 0)
    actions.push({ icon: '💳', label: 'Pay for results', note: `${unpaidResults.length} unpaid`, href: '/student/results', urgent: true });
  if (pendingPayments > 0)
    actions.push({ icon: '⏳', label: 'Pending payment', note: 'Awaiting verification', href: '/student/payments', urgent: true });
  if (latestReg?.status === 'rejected')
    actions.push({ icon: '📝', label: 'Registration rejected', note: latestReg.reviewNote ?? 'Re-upload form', href: '/student/registration', urgent: true });
  if (unread > 0)
    actions.push({ icon: '🔔', label: `${unread} unread notification${unread > 1 ? 's' : ''}`, note: 'Tap to view all', href: '/student/notifications', urgent: false });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
          <p className="text-sm text-gray-400">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      {activeEvent && <EventModal event={activeEvent} onClose={() => setActiveEvent(null)} />}

      {/* ── Hero greeting row ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-3xl overflow-hidden p-6 md:p-8"
        style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 60%, #16a34a 100%)' }}
      >
        {/* Orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #4ade80, transparent)' }} />
        <div className="absolute bottom-0 left-20 w-40 h-40 rounded-full opacity-10 blur-2xl"
          style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />

        {/* Top row: avatar + name + CGPA */}
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <ProfileAvatar user={profile} size="lg" />
            <div>
              <p className="text-brand-200 text-sm font-medium mb-1">{greeting} 👋</p>
              <h1 className="text-white font-bold text-2xl md:text-3xl leading-tight">
                {profile?.name?.split(' ').slice(0, 2).join(' ') ?? 'Student'}
              </h1>
              <p className="text-brand-300 text-sm mt-1">{profile?.program} · {profile?.level} · {profile?.userId}</p>
            </div>
          </div>
          {/* CGPA + Semester GPAs side by side */}
          <div className="flex-shrink-0 flex items-center gap-4 bg-white/15 border border-white/25 rounded-2xl px-5 py-4 backdrop-blur-sm">
            {/* Big CGPA number */}
            <div className="text-center flex-shrink-0">
              <div className="text-4xl font-black text-white leading-none">
                {gpa && gpa.cgpa > 0 ? gpa.cgpa.toFixed(2) : '—'}
              </div>
              <div className="text-brand-300 text-xs font-bold uppercase tracking-widest mt-1">CGPA</div>
            </div>
            {/* Vertical divider */}
            {gpa && gpa.semesters.length > 0 && (
              <div className="w-px self-stretch bg-white/20" />
            )}
            {/* Semester list beside */}
            {gpa && gpa.semesters.length > 0 && (
              <div className="space-y-1.5">
                {[...gpa.semesters]
                  .sort((a, b) => a.session.localeCompare(b.session) || a.semester.localeCompare(b.semester))
                  .map((s, i) => (
                    <div key={i} className="flex items-center gap-2.5 whitespace-nowrap">
                      <span className="text-[11px] text-brand-300 font-semibold">
                        {s.session.split('/')[0]} {s.semester === 'first' ? 'S1' : 'S2'}
                      </span>
                      <span className={`text-sm font-black ${s.sgpa >= 3.5 ? 'text-green-300' : s.sgpa >= 2.5 ? 'text-yellow-300' : 'text-red-300'}`}>
                        {s.sgpa.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Big stat cards row */}
        <div className="relative mt-6 grid grid-cols-3 gap-3">
          {[
            {
              label: 'Credits Earned',
              value: String(gpa?.totalCreditsEarned ?? 0),
              sub: 'total credit units',
              icon: BookOpen,
            },
            {
              label: 'Semesters',
              value: String(gpa?.semesters.length ?? 0),
              sub: 'completed',
              icon: FileText,
            },
            {
              label: 'Results',
              value: `${paidResults.length}/${results.length}`,
              sub: 'subscribed',
              icon: Bell,
            },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 border border-white/15 rounded-2xl px-4 py-4 text-center backdrop-blur-sm">
              <s.icon className="w-4 h-4 text-brand-300 mx-auto mb-2" />
              <div className="text-white font-black text-2xl md:text-3xl leading-none">{s.value}</div>
              <div className="text-brand-300 text-[11px] font-semibold mt-1 leading-tight">{s.label}</div>
              <div className="text-white/35 text-[9px] mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SGPA Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">SGPA Trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">{gpa?.semesters.length ?? 0} semesters recorded</p>
            </div>
            {gpa && gpa.semesters.length > 0 && (
              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-1 rounded-lg">
                CGPA {gpa.cgpa.toFixed(2)}
              </span>
            )}
          </div>
          {gpa && gpa.semesters.length >= 2 ? (
            <SGPATrendChart semesters={gpa.semesters} />
          ) : (
            <div className="flex flex-col items-center justify-center h-28 gap-2">
              <div className="text-3xl">📈</div>
              <p className="text-xs text-gray-400 text-center">
                Trend appears after 2+ subscribed semesters
              </p>
            </div>
          )}
        </motion.div>

        {/* Course Performance — vertical bar chart with semester toggle */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Course Performance</h2>
              <p className="text-xs text-gray-400 mt-0.5">scores out of 100</p>
            </div>
            {activeResult && (
              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-1 rounded-lg">
                SGPA {activeResult.sgpa.toFixed(2)}
              </span>
            )}
          </div>

          {/* Semester toggle pills */}
          {gpa && gpa.semesters.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[...gpa.semesters]
                .sort((a, b) => a.session.localeCompare(b.session) || a.semester.localeCompare(b.semester))
                .map((s) => (
                  <button
                    key={s.gradebookId}
                    onClick={() => void handleSelectSem(s.gradebookId)}
                    className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all ${
                      activeSemGbId === s.gradebookId
                        ? 'bg-brand-700 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s.session.split('/')[0]} {s.semester === 'first' ? 'S1' : 'S2'}
                  </button>
                ))}
            </div>
          )}

          {/* Vertical bar chart */}
          {loadingSem ? (
            <div className="flex-1 flex items-center justify-center h-36">
              <div className="w-6 h-6 rounded-full border-2 border-brand-200 border-t-brand-700 animate-spin" />
            </div>
          ) : activeResult ? (
            <div className="flex-1 overflow-x-auto">
              {(() => {
                const CHART_H = 130;
                const BAR_W = 34;
                const GAP = 10;
                const n = activeResult.courses.length;
                const totalW = n * (BAR_W + GAP) - GAP;
                return (
                  <svg
                    viewBox={`0 0 ${totalW} ${CHART_H + 44}`}
                    style={{ width: Math.max(totalW, 220), height: CHART_H + 44 }}
                  >
                    {/* Y-axis guide lines */}
                    {[25, 50, 75, 100].map((v) => {
                      const y = CHART_H - (v / 100) * CHART_H;
                      return (
                        <g key={v}>
                          <line x1={0} y1={y} x2={totalW} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                          <text x={0} y={y - 2} fontSize="7" fill="#d1d5db">{v}</text>
                        </g>
                      );
                    })}
                    {activeResult.courses.map((c, i) => {
                      const score = c.total ?? 0;
                      const barH = (score / 100) * CHART_H;
                      const x = i * (BAR_W + GAP);
                      const color = score >= 70 ? '#16a34a' : score >= 60 ? '#2563eb' : score >= 50 ? '#7c3aed' : score >= 40 ? '#d97706' : '#dc2626';
                      const shortCode = c.courseCode.replace(/[A-Za-z]+/, '').slice(0, 5);
                      return (
                        <g key={c.courseCode}>
                          {/* Bar */}
                          <rect x={x} y={CHART_H - barH} width={BAR_W} height={barH} fill={color} rx="4" />
                          {/* Score inside bar */}
                          {barH > 16 && (
                            <text x={x + BAR_W / 2} y={CHART_H - barH + 13} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">{score}</text>
                          )}
                          {/* Grade label */}
                          <text x={x + BAR_W / 2} y={CHART_H + 13} textAnchor="middle" fontSize="10" fontWeight="bold" fill={color}>{c.grade ?? '—'}</text>
                          {/* Course code */}
                          <text x={x + BAR_W / 2} y={CHART_H + 27} textAnchor="middle" fontSize="8" fill="#9ca3af">{shortCode}</text>
                          {/* Full code tooltip area */}
                          <title>{c.courseCode}: {c.courseTitle} ({score}/100)</title>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center h-36 gap-2">
              <div className="text-3xl">📊</div>
              <p className="text-xs text-gray-400 text-center">Subscribe to a result to see performance</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Action Required + Recent Results ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Action Required */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">⚡ Action Required</h2>
            {actions.some((a) => a.urgent) && (
              <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {actions.filter((a) => a.urgent).length} urgent
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {actions.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="text-2xl mb-2">✅</div>
                <p className="text-sm font-medium text-gray-700">All caught up!</p>
                <p className="text-xs text-gray-400 mt-1">Nothing needs your attention right now.</p>
              </div>
            ) : (
              actions.map((action, i) => (
                <Link key={i} to={action.href}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <span className="text-base mt-0.5 flex-shrink-0">{action.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${action.urgent ? 'text-gray-900' : 'text-gray-600'}`}>
                      {action.label}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{action.note}</p>
                  </div>
                  {action.urgent && <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />}
                </Link>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Results */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">📋 Recent Results</h2>
            <Link to="/student/results" className="text-xs text-brand-700 font-medium hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {paidResults.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="text-2xl mb-2">📂</div>
                <p className="text-sm font-medium text-gray-700">No paid results yet</p>
                <p className="text-xs text-gray-400 mt-1">Subscribe to a result to view it here.</p>
              </div>
            ) : (
              paidResults.slice(0, 4).map((r) => (
                <div key={r.gradebookId} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{r.gradebookName}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {r.level} · {r.session} · <span className="capitalize">{r.semester}</span> Sem
                    </p>
                  </div>
                  <Link to={`/student/results/${r.gradebookId}`}
                    className="flex-shrink-0 text-xs text-brand-700 font-semibold hover:text-brand-900 ml-2 flex items-center gap-1">
                    View <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Upcoming Events + Grade Distribution ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* Upcoming Events */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">📅 Upcoming Events</h2>
          <Link to="/student/notifications" className="text-xs text-brand-700 font-medium hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {UPCOMING_EVENTS.map((ev, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className="text-center bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 flex-shrink-0 min-w-[52px]">
                <div className="text-[9px] font-bold text-brand-600 uppercase tracking-wide">{ev.date.month}</div>
                <div className="font-bold text-brand-900 text-lg leading-none">{ev.date.day}</div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{ev.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-[10px] text-gray-400">
                    <MapPin className="w-2.5 h-2.5" />{ev.location}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  ev.tag === 'Free' ? 'bg-brand-100 text-brand-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {ev.tag}
                </span>
                <button
                  onClick={() => setActiveEvent(ev)}
                  className="text-[10px] font-semibold text-brand-700 hover:text-brand-900 border border-brand-200 hover:border-brand-400 px-2.5 py-1 rounded-lg transition-colors"
                >
                  More Info
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Grade Distribution — beside Upcoming Events */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.32 }}
        className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Grade Distribution</h2>
            <p className="text-xs text-gray-400 mt-0.5">A – F breakdown across courses</p>
          </div>
          <Link to="/student/results" className="text-xs text-brand-700 font-medium hover:underline">
            View results →
          </Link>
        </div>
        <GradePieChart gpa={gpa} />
        {results.length > 0 && (
          <div className="mt-4 space-y-1.5 pt-3 border-t border-gray-100">
            {results.slice(0, 3).map((r) => (
              <div key={r.gradebookId} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate max-w-[140px]">{r.gradebookName}</span>
                <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                  r.hasPaid ? 'bg-brand-100 text-brand-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {r.hasPaid ? 'Subscribed' : 'Unpaid'}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      </div>{/* end events+distribution grid */}

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"
      >
        <h2 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
          {[
            { icon: '📋', label: 'My Results',  to: '/student/results' },
            { icon: '💰', label: 'NACOS Due',   to: '/student/school-fees' },
            { icon: '📈', label: 'Transcript',  to: '/student/transcript' },
            { icon: '🗳️', label: 'Elections',   to: '/student/elections' },
            { icon: '👤', label: 'Profile',     to: '/student/profile' },
          ].map((qa) => (
            <Link key={qa.to} to={qa.to}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all text-center group">
              <span className="text-2xl group-hover:scale-110 transition-transform">{qa.icon}</span>
              <span className="text-[10px] font-semibold text-gray-600 group-hover:text-brand-700 leading-tight">{qa.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
