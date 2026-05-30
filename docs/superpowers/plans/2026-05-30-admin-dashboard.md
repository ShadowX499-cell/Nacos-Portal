# Admin Dashboard & AdminLayout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared AdminLayout sidebar, redesign AdminDashboard with 6 KPI cards, SVG charts, alert strip, and activity feed, and wire new backend stats.

**Architecture:** AdminLayout wraps all admin pages via a nested React Router route (same pattern as StudentLayout). The backend `getDashboardStats` method is extended in-place. The dashboard fetches a single `/admin/dashboard` endpoint and renders everything client-side.

**Tech Stack:** React 18, TypeScript 5, Tailwind CSS 3, Lucide React, Motion/React (animations), Express 4, Prisma 5 (PostgreSQL)

---

## File Map

| File | Action |
|---|---|
| `backend/src/modules/admin/admin.service.ts` | Extend `getDashboardStats` with 7 new fields |
| `frontend/src/types/index.ts` | Extend `DashboardStats` interface |
| `frontend/src/components/AdminLayout.tsx` | **Create** — sidebar + topbar + Outlet |
| `frontend/src/App.tsx` | Wrap admin routes in `<AdminLayout>` |
| `frontend/src/pages/admin/AdminDashboard.tsx` | **Rewrite** |
| `frontend/src/pages/admin/UserListPage.tsx` | Remove `<nav>` block |
| `frontend/src/pages/admin/CreateUserPage.tsx` | Remove `<nav>` block |
| `frontend/src/pages/admin/GradebookListPage.tsx` | Remove `<nav>` block |
| `frontend/src/pages/admin/CreateGradebookPage.tsx` | Remove `<nav>` block |
| `frontend/src/pages/admin/GradebookDetailPage.tsx` | Remove `<nav>` block |
| `frontend/src/pages/admin/GradeEntryPage.tsx` | Remove `<nav>` block |

---

## Task 1: Extend backend getDashboardStats

**Files:**
- Modify: `backend/src/modules/admin/admin.service.ts` (method `getDashboardStats`, ~line 190)

- [ ] **Step 1: Replace `getDashboardStats` with the extended version**

Replace the entire method (lines 188–211) with:

```typescript
async getDashboardStats(departmentId: string): Promise<{
  totalStudents: number;
  pendingValidations: number;
  activeElections: number;
  unpublishedResults: number;
  totalRevenue: number;
  publishedGradebooks: number;
  todayAttendanceSessions: number;
  draftGradebooksReady: number;
  monthlyRevenue: { month: string; total: number }[];
  studentsByLevel: { level: string; count: number }[];
  recentActivity: {
    type: 'registered' | 'activated' | 'payment' | 'result_published';
    label: string;
    time: string;
  }[];
}> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    totalStudents,
    pendingValidations,
    activeElections,
    unpublishedResults,
    revenueResult,
    publishedGradebooks,
    todayAttendanceSessions,
    draftGradebooksWithCourses,
    recentUsers,
    recentPayments,
    recentGradebooks,
    levelCounts,
    successPayments,
  ] = await Promise.all([
    this.db.user.count({ where: { departmentId, role: UserRole.student } }),
    this.db.user.count({ where: { departmentId, role: UserRole.student, status: UserStatus.pending } }),
    this.db.election.count({ where: { departmentId, status: 'active' } }),
    this.db.gradebook.count({ where: { departmentId, status: 'draft' } }),
    this.db.payment.aggregate({ where: { status: 'success' }, _sum: { amount: true } }),
    this.db.gradebook.count({ where: { departmentId, status: 'published' } }),
    this.db.attendanceSession.count({ where: { departmentId, createdAt: { gte: todayStart } } }),
    this.db.gradebook.findMany({
      where: { departmentId, status: 'draft' },
      include: { courses: { include: { _count: { select: { studentGrades: true } } } } },
    }),
    this.db.user.findMany({
      where: { departmentId, role: UserRole.student },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { name: true, status: true, createdAt: true, updatedAt: true },
    }),
    this.db.payment.findMany({
      where: { status: 'success', user: { departmentId } },
      orderBy: { paidAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
    this.db.gradebook.findMany({
      where: { departmentId, status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: { name: true, publishedAt: true },
    }),
    Promise.all(
      (['L100', 'L200', 'L300', 'L400'] as const).map(async (level) => ({
        level,
        count: await this.db.user.count({ where: { departmentId, role: UserRole.student, level } }),
      }))
    ),
    this.db.payment.findMany({
      where: { status: 'success', paidAt: { gte: sixMonthsAgo } },
      select: { amount: true, paidAt: true },
    }),
  ]);

  // Draft gradebooks where every course has at least one grade
  const draftGradebooksReady = draftGradebooksWithCourses.filter(
    (gb) => gb.courses.length > 0 && gb.courses.every((c) => c._count.studentGrades > 0)
  ).length;

  // Monthly revenue — last 6 months
  const monthlyMap = new Map<string, number>();
  for (const p of successPayments) {
    if (!p.paidAt) continue;
    const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(p.amount));
  }
  const monthlyRevenue: { month: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
    monthlyRevenue.push({ month: label, total: monthlyMap.get(key) ?? 0 });
  }

  // Recent activity — merge, sort, take 10
  const activities: { type: 'registered' | 'activated' | 'payment' | 'result_published'; label: string; time: string }[] = [
    ...recentUsers.map((u) => ({
      type: (u.status === UserStatus.validated ? 'activated' : 'registered') as 'activated' | 'registered',
      label: u.status === UserStatus.validated ? `${u.name} account activated` : `${u.name} registered`,
      time: (u.status === UserStatus.validated ? u.updatedAt : u.createdAt).toISOString(),
    })),
    ...recentPayments.map((p) => ({
      type: 'payment' as const,
      label: `₦${Number(p.amount).toLocaleString()} payment — ${p.user.name}`,
      time: (p.paidAt ?? p.createdAt).toISOString(),
    })),
    ...recentGradebooks.map((g) => ({
      type: 'result_published' as const,
      label: `${g.name} result published`,
      time: (g.publishedAt ?? new Date()).toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10);

  return {
    totalStudents,
    pendingValidations,
    activeElections,
    unpublishedResults,
    totalRevenue: Number(revenueResult._sum.amount ?? 0),
    publishedGradebooks,
    todayAttendanceSessions,
    draftGradebooksReady,
    monthlyRevenue,
    studentsByLevel: levelCounts,
    recentActivity: activities,
  };
}
```

- [ ] **Step 2: Verify backend TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

---

## Task 2: Extend frontend DashboardStats type

**Files:**
- Modify: `frontend/src/types/index.ts` (the `DashboardStats` interface, ~line 77)

- [ ] **Step 1: Replace the DashboardStats interface**

```typescript
export interface DashboardStats {
  totalStudents: number;
  pendingValidations: number;
  activeElections: number;
  unpublishedResults: number;
  totalRevenue: number;
  publishedGradebooks: number;
  todayAttendanceSessions: number;
  draftGradebooksReady: number;
  monthlyRevenue: { month: string; total: number }[];
  studentsByLevel: { level: string; count: number }[];
  recentActivity: {
    type: 'registered' | 'activated' | 'payment' | 'result_published';
    label: string;
    time: string;
  }[];
}
```

---

## Task 3: Create AdminLayout component

**Files:**
- Create: `frontend/src/components/AdminLayout.tsx`

- [ ] **Step 1: Create the file with this content**

```typescript
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, Bell, Lock, LayoutDashboard, Users, BookOpen, Vote, Fingerprint, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NacosLogo from './NacosLogo';

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',   to: '/admin/dashboard' },
      { icon: Users,           label: 'Students',    to: '/admin/users'     },
      { icon: BookOpen,        label: 'Gradebooks',  to: '/admin/gradebooks'},
    ],
  },
  {
    label: 'Modules',
    items: [
      { icon: Vote,        label: 'Elections',  to: '/admin/elections',  phase: 'Phase 3' },
      { icon: Fingerprint, label: 'Attendance', to: '/admin/attendance', phase: 'Phase 4' },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: Bell,     label: 'Notifications', to: '/admin/notifications' },
      { icon: Settings, label: 'Settings',       to: '/admin/settings'     },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard':    'Dashboard',
  '/admin/users':        'Students',
  '/admin/users/new':    'Add Student',
  '/admin/gradebooks':   'Gradebooks',
  '/admin/gradebooks/new': 'New Gradebook',
  '/admin/elections':    'Elections',
  '/admin/attendance':   'Attendance',
  '/admin/notifications':'Notifications',
  '/admin/settings':     'Settings',
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AD';

  const pageTitle = Object.entries(PAGE_TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => location.pathname.startsWith(path))?.[1] ?? 'Admin';

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 flex-shrink-0">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
          <NacosLogo size={28} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white text-sm leading-tight truncate">NACOS Portal</p>
          <p className="text-white/40 text-[10px]">AIFUE · Admin</p>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden ml-auto w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="px-3 mb-1 text-white/40 text-[11px] font-bold uppercase tracking-widest">
              {section.label}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin/dashboard'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-all ${
                    isActive
                      ? 'bg-white/15 text-white font-semibold ring-1 ring-white/10'
                      : 'text-white/65 hover:bg-white/8 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {'phase' in item && item.phase && (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-white/30 bg-white/8 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    <Lock className="w-2.5 h-2.5" />
                    {item.phase}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white/5 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.name || 'Admin'}</p>
            <p className="text-white/50 text-xs truncate">{user?.userId}</p>
          </div>
        </div>
        <button
          onClick={() => void logout()}
          className="w-full text-left px-3 py-1.5 text-white/40 hover:text-white text-xs rounded-lg hover:bg-white/8 transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-56 flex-col flex-shrink-0 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #052e16 0%, #14532d 100%)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col md:hidden overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(180deg, #052e16 0%, #14532d 100%)' }}
          >
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <p className="text-sm text-gray-500">
              Admin <span className="text-gray-300 mx-1">›</span>
              <span className="font-semibold text-gray-900">{pageTitle}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full border border-brand-200 capitalize">
              {user?.role?.replace('_', ' ')}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

---

## Task 4: Wrap admin routes in AdminLayout (App.tsx)

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add AdminLayout import**

After the existing admin page imports, add:
```typescript
import AdminLayout from './components/AdminLayout';
```

- [ ] **Step 2: Wrap admin routes in a nested AdminLayout route**

Replace the admin routes block (the `<Route element={<ProtectedRoute roles={['admin', 'super_admin']} />}>` block):

```tsx
{/* ── Admin ────────────────────────────────────────────────────── */}
<Route element={<ProtectedRoute roles={['admin', 'super_admin']} />}>
  <Route element={<AdminLayout />}>
    <Route path="/admin/dashboard"                                          element={<AdminDashboard />} />
    <Route path="/admin/users"                                              element={<UserListPage />} />
    <Route path="/admin/users/new"                                          element={<CreateUserPage />} />
    <Route path="/admin/gradebooks"                                         element={<GradebookListPage />} />
    <Route path="/admin/gradebooks/new"                                     element={<CreateGradebookPage />} />
    <Route path="/admin/gradebooks/:id"                                     element={<GradebookDetailPage />} />
    <Route path="/admin/gradebooks/:id/courses/:courseId/grades"            element={<GradeEntryPage />} />
  </Route>
</Route>
```

---

## Task 5: Strip the repeated nav from all 7 admin pages

For each file below, remove the `<nav className="bg-brand-800 ...">...</nav>` block **and** replace the outer `<div className="min-h-screen bg-gray-50">` wrapper with just a plain `<>` fragment or remove it entirely, since AdminLayout now provides the shell.

**Files:** `AdminDashboard.tsx`, `UserListPage.tsx`, `CreateUserPage.tsx`, `GradebookListPage.tsx`, `CreateGradebookPage.tsx`, `GradebookDetailPage.tsx`, `GradeEntryPage.tsx`

- [ ] **Step 1: AdminDashboard.tsx** — remove the `const { user, logout } = useAuth();` line and the entire `<nav>` JSX block; replace `<div className="min-h-screen bg-gray-50">` with `<div className="p-0">` (or keep as-is, the new component will replace the whole file in Task 6)

  *Skip this step — AdminDashboard.tsx will be fully replaced in Task 6.*

- [ ] **Step 2: UserListPage.tsx** — remove `useAuth` import + destructure + the entire `<nav>` block; change outer `<div className="min-h-screen bg-gray-50">` to `<div>`

- [ ] **Step 3: CreateUserPage.tsx** — same pattern as Step 2

- [ ] **Step 4: GradebookListPage.tsx** — same pattern as Step 2

- [ ] **Step 5: CreateGradebookPage.tsx** — same pattern as Step 2

- [ ] **Step 6: GradebookDetailPage.tsx** — same pattern (remove `logout` from destructure, keep `user` if used; remove `<nav>` block; unwrap outer div)

- [ ] **Step 7: GradeEntryPage.tsx** — same pattern as Step 2

---

## Task 6: Rewrite AdminDashboard.tsx

**Files:**
- Rewrite: `frontend/src/pages/admin/AdminDashboard.tsx`

- [ ] **Step 1: Replace entire file with**

```typescript
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Users, Clock, TrendingUp, BookOpen, Vote, Fingerprint,
  CheckCircle, AlertTriangle, ArrowRight,
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

const ACTIVITY_ICONS: Record<string, string> = {
  registered:       '👤',
  activated:        '✅',
  payment:          '💳',
  result_published: '📋',
};

// ── SVG Bar Chart (payments over time) ───────────────────────────────────────

function RevenueBarChart({ data }: { data: { month: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const W = 340, H = 110, BAR_W = 34, GAP = 12;
  const totalW = data.length * (BAR_W + GAP) - GAP;
  const offsetX = (W - totalW) / 2;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 32}`} className="w-full" style={{ minWidth: 280 }}>
        {/* Y-axis guide lines */}
        {[0.25, 0.5, 0.75, 1].map((pct) => {
          const y = H - pct * H;
          return (
            <line key={pct} x1={0} y1={y} x2={W} y2={y}
              stroke="#f3f4f6" strokeWidth="1" />
          );
        })}
        {data.map((d, i) => {
          const barH = Math.max((d.total / max) * H, d.total > 0 ? 4 : 0);
          const x = offsetX + i * (BAR_W + GAP);
          return (
            <g key={d.month}>
              <rect x={x} y={H - barH} width={BAR_W} height={barH}
                fill="#16a34a" rx="4" opacity="0.85" />
              {barH > 14 && (
                <text x={x + BAR_W / 2} y={H - barH + 11}
                  textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
                  {d.total >= 1000 ? `${(d.total / 1000).toFixed(0)}k` : d.total}
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

// ── SVG Donut Chart (students by level) ──────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  L100: '#2563eb', L200: '#7c3aed', L300: '#16a34a', L400: '#d97706',
};

function LevelDonut({ data }: { data: { level: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-gray-400">
        No student data
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

// ── Main Dashboard ────────────────────────────────────────────────────────────

const KPI_CARDS = (s: DashboardStats) => [
  {
    label: 'Total Students',
    value: s.totalStudents,
    icon: Users,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    iconBg: 'bg-blue-600',
    href: '/admin/users',
  },
  {
    label: 'Pending Activations',
    value: s.pendingValidations,
    icon: Clock,
    color: s.pendingValidations > 0 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-600',
    iconBg: s.pendingValidations > 0 ? 'bg-orange-500' : 'bg-gray-400',
    href: '/admin/users?status=pending',
    urgent: s.pendingValidations > 0,
  },
  {
    label: 'Total Revenue',
    value: `₦${s.totalRevenue.toLocaleString()}`,
    icon: TrendingUp,
    color: 'bg-brand-50 border-brand-200 text-brand-700',
    iconBg: 'bg-brand-600',
    href: null,
  },
  {
    label: 'Published Results',
    value: s.publishedGradebooks,
    icon: BookOpen,
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    iconBg: 'bg-purple-600',
    href: '/admin/gradebooks',
  },
  {
    label: 'Active Elections',
    value: s.activeElections,
    icon: Vote,
    color: 'bg-teal-50 border-teal-200 text-teal-700',
    iconBg: 'bg-teal-600',
    href: '/admin/elections',
  },
  {
    label: "Today's Attendance",
    value: s.todayAttendanceSessions,
    icon: Fingerprint,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    iconBg: 'bg-indigo-600',
    href: '/admin/attendance',
  },
];

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

  // Build alerts
  const alerts: { id: string; type: 'warning' | 'info'; message: string; href: string }[] = [];
  if (stats.pendingValidations > 0)
    alerts.push({ id: 'pending', type: 'warning', message: `${stats.pendingValidations} student${stats.pendingValidations > 1 ? 's' : ''} awaiting activation`, href: '/admin/users?status=pending' });
  if (stats.draftGradebooksReady > 0)
    alerts.push({ id: 'drafts', type: 'warning', message: `${stats.draftGradebooksReady} gradebook${stats.draftGradebooksReady > 1 ? 's' : ''} ready to publish`, href: '/admin/gradebooks' });
  if (stats.activeElections === 0)
    alerts.push({ id: 'no-election', type: 'info', message: 'No active election is currently running', href: '/admin/elections' });

  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.has(a.id));

  const cards = KPI_CARDS(stats);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link to="/admin/users/new"
          className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
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
              <span className="flex-1">{alert.message}</span>
              <Link to={alert.href} className="text-xs font-bold underline flex-shrink-0">
                View <ArrowRight className="inline w-3 h-3" />
              </Link>
              <button
                onClick={() => setDismissedAlerts((prev) => new Set([...prev, alert.id]))}
                className="ml-1 opacity-50 hover:opacity-100 text-lg leading-none"
              >×</button>
            </motion.div>
          ))}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((card, i) => {
          const Inner = (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`relative bg-white rounded-2xl border-2 p-4 shadow-sm hover:shadow-md transition-all ${card.color} ${card.href ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
            >
              {card.urgent && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              )}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.iconBg}`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl font-black text-gray-900 leading-none mb-1">{card.value}</div>
              <div className="text-xs font-semibold leading-tight">{card.label}</div>
            </motion.div>
          );
          return card.href ? <Link key={card.label} to={card.href}>{Inner}</Link> : Inner;
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
              <p className="text-xs text-gray-400 mt-0.5">All successful Paystack payments</p>
            </div>
            <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-1 rounded-lg">
              ₦{stats.totalRevenue.toLocaleString()} total
            </span>
          </div>
          <RevenueBarChart data={stats.monthlyRevenue} />
        </motion.div>

        {/* Students by level donut */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Students by Level</h2>
              <p className="text-xs text-gray-400 mt-0.5">Current enrollment</p>
            </div>
          </div>
          <LevelDonut data={stats.studentsByLevel} />
        </motion.div>
      </div>

      {/* Activity feed + Quick Actions */}
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
                    <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(event.time)}</p>
                  </div>
                </div>
              ))
            )}
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
              { icon: '👤', label: 'Add Student',       href: '/admin/users/new',       live: true  },
              { icon: '📋', label: 'View Students',     href: '/admin/users',            live: true  },
              { icon: '📚', label: 'Gradebooks',        href: '/admin/gradebooks',       live: true  },
              { icon: '📊', label: 'Grade Entry',       href: '/admin/gradebooks',       live: true  },
              { icon: '🗳️', label: 'Elections',         href: '/admin/elections',        live: false },
              { icon: '🖐️', label: 'Attendance',        href: '/admin/attendance',       live: false },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-sm ${
                  action.live
                    ? 'border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 hover:text-brand-800'
                    : 'border-gray-100 bg-gray-50 text-gray-400 cursor-default pointer-events-none'
                }`}
              >
                <span className="text-xl leading-none">{action.icon}</span>
                <span className="font-medium text-xs">{action.label}</span>
                {!action.live && (
                  <span className="ml-auto text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Soon</span>
                )}
              </Link>
            ))}
          </div>

          {/* Stats summary */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Students', value: stats.totalStudents },
              { label: 'Gradebooks', value: stats.publishedGradebooks },
              { label: 'Revenue', value: `₦${(stats.totalRevenue / 1000).toFixed(0)}k` },
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
```

---

## Task 7: TypeScript check + commit

- [ ] **Step 1: Run TypeScript check on frontend**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 2: Run TypeScript check on backend**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AdminLayout.tsx \
        frontend/src/pages/admin/AdminDashboard.tsx \
        frontend/src/pages/admin/UserListPage.tsx \
        frontend/src/pages/admin/CreateUserPage.tsx \
        frontend/src/pages/admin/GradebookListPage.tsx \
        frontend/src/pages/admin/CreateGradebookPage.tsx \
        frontend/src/pages/admin/GradebookDetailPage.tsx \
        frontend/src/pages/admin/GradeEntryPage.tsx \
        frontend/src/App.tsx \
        frontend/src/types/index.ts \
        backend/src/modules/admin/admin.service.ts

git commit -m "feat: admin sidebar layout, rich dashboard with charts and activity feed"
```

---

## Self-Review

**Spec coverage:**
- ✅ AdminLayout with dark green sidebar, phase badges, mobile drawer
- ✅ 6 KPI cards (totalStudents, pendingValidations, totalRevenue, publishedGradebooks, activeElections, todayAttendanceSessions)
- ✅ Revenue bar chart (SVG)
- ✅ Students-by-level donut (SVG)
- ✅ Alert strip (pendingValidations, draftGradebooksReady, no active election)
- ✅ Recent activity feed (10 events from users/payments/gradebooks)
- ✅ Backend getDashboardStats extended with all 7 new fields
- ✅ DashboardStats type extended
- ✅ All 7 existing admin pages have nav removed
- ✅ App.tsx wrapped in AdminLayout

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:** `DashboardStats` fields defined in Task 2 match usage in Task 6 KPI_CARDS and RevenueBarChart/LevelDonut. `recentActivity[].type` union matches `ACTIVITY_ICONS` keys.
