# Admin Dashboard & AdminLayout — Design Spec
**Date:** 2026-05-30  
**Status:** Approved  
**Sub-project:** A of A→B→C (Admin Dashboard → Elections → Biometric Attendance)

---

## 1. Goal

Replace the scattered per-page top-nav pattern across all admin pages with a shared `AdminLayout` component (persistent sidebar), and redesign `AdminDashboard.tsx` with rich KPI cards, SVG charts, an alert strip, and a recent-activity feed.

---

## 2. Scope

### In scope
- New `AdminLayout` component with sidebar + topbar
- Wrap all 6 existing admin pages in `AdminLayout`
- Redesign `AdminDashboard.tsx` — KPI cards, charts, alerts, activity feed
- Extend `GET /admin/dashboard` backend endpoint with new fields

### Out of scope
- Real-time updates (Phase 3 Socket.io)
- Admin notification sending (separate page)
- Election creation from dashboard (Elections module — sub-project B)
- Biometric data on dashboard (sub-project C)

---

## 3. AdminLayout Component

**File:** `frontend/src/components/AdminLayout.tsx`

### Sidebar
- Dark green gradient (`#052e16 → #14532d`) — matches student portal brand
- Width: `w-56` on desktop, overlay drawer on mobile
- Logo + "NACOS Portal · Admin" header with white circle background on logo

**Nav sections:**
```
MAIN
  🏠 Dashboard          /admin/dashboard
  👥 Students           /admin/users
  📚 Gradebooks         /admin/gradebooks

MODULES
  🗳️ Elections          /admin/elections     [Phase 3 lock badge]
  🖐️ Attendance         /admin/attendance    [Phase 4 lock badge]

SYSTEM
  🔔 Notifications      /admin/notifications
```

Locked items: still render as links, show `Lock` icon + phase badge. Removing the lock later requires only removing the badge — no layout change.

**Footer:** admin avatar (initials), name, userId, sign-out button.

### Topbar
- White background, border-bottom
- Left: hamburger (mobile only) + breadcrumb ("Admin › Page Name")
- Right: role badge + admin name + notification bell (unread count)

### Mobile
- Hamburger opens an overlay drawer (same pattern as `StudentLayout.tsx`)
- Backdrop click closes drawer
- Close button inside drawer header

### Migration of existing pages
Remove individual `<nav>` blocks from:
- `AdminDashboard.tsx`
- `UserListPage.tsx`
- `CreateUserPage.tsx`
- `GradebookListPage.tsx`
- `CreateGradebookPage.tsx`
- `GradebookDetailPage.tsx`
- `GradeEntryPage.tsx`

Each page is wrapped at the route level in `AdminLayout` (via React Router nested routes or direct wrapping).

---

## 4. Dashboard Page

**File:** `frontend/src/pages/admin/AdminDashboard.tsx`

### 4.1 KPI Cards (6 cards, 3-col desktop / 2-col tablet / 1-col mobile)

| # | Label | Source field | Accent | Link |
|---|---|---|---|---|
| 1 | Total Students | `totalStudents` | Blue | `/admin/users` |
| 2 | Pending Activations | `pendingValidations` | Orange (urgent if >0) | `/admin/users?status=pending` |
| 3 | Total Revenue | `totalRevenue` (₦) | Green | `/admin/payments` |
| 4 | Published Gradebooks | `publishedGradebooks` | Purple | `/admin/gradebooks` |
| 5 | Active Elections | `activeElections` | Teal | `/admin/elections` |
| 6 | Today's Attendance | `todayAttendanceSessions` | Indigo | `/admin/attendance` |

Each card shows: large value, label, trend arrow + change text (e.g. "+3 this month").

### 4.2 Charts (SVG, no external library)

**Payments Over Time** (left, ~60% width):
- Horizontal bar chart, last 6 months
- Y-axis: month labels; X-axis: ₦ amount
- Bars in brand green (`#16a34a`)
- Data from `monthlyRevenue: { month: string; total: number }[]`

**Students by Level** (right, ~40% width):
- Donut chart (CSS conic-gradient, same pattern as student dashboard)
- Segments: L100 (blue), L200 (purple), L300 (green), L400 (orange)
- Centre: total count
- Legend below with counts
- Data from `studentsByLevel: { level: string; count: number }[]`

### 4.3 Alert Strip

Shown only when alerts exist. Dismissible per alert (session state only — no persistence).

Alert conditions (derived from stats, no extra backend query):
- `pendingValidations > 0` → "N students awaiting activation"
- Gradebooks with all grades entered but `status = draft` → "N gradebooks ready to publish" (requires `draftGradebooksReady` field from backend)
- `activeElections === 0` → "No active election running"

### 4.4 Recent Activity Feed

Last 10 events, time-ago formatted. Data from `recentActivity[]` array.

Event types and icons:
- `registered` → 👤 "{name} registered"
- `activated` → ✅ "{name} account activated"
- `payment` → 💳 "₦{amount} payment — {name}"
- `result_published` → 📋 "{gradebookName} result published"

---

## 5. Backend Changes

**File:** `backend/src/modules/admin/admin.service.ts` — extend `getDashboard()`

### New fields added to dashboard response

```ts
interface DashboardStats {
  // existing
  totalStudents: number;
  pendingValidations: number;
  activeElections: number;
  unpublishedResults: number;

  // new
  totalRevenue: number;                  // SUM of payments where status='success'
  publishedGradebooks: number;           // COUNT gradebooks where status='published'
  todayAttendanceSessions: number;       // COUNT attendance_sessions created today
  draftGradebooksReady: number;          // COUNT draft gradebooks where all courses have ≥1 grade
  monthlyRevenue: { month: string; total: number }[];   // last 6 months
  studentsByLevel: { level: string; count: number }[];  // L100-L400 breakdown
  recentActivity: {
    type: 'registered' | 'activated' | 'payment' | 'result_published';
    label: string;
    time: string;   // ISO timestamp
  }[];
}
```

### Query strategy for `recentActivity`
Run three parallel queries, merge, sort by time desc, take 10:
1. `users` where `role='student'`, order by `createdAt desc`, limit 5 — type `registered` or `activated`
2. `payments` where `status='success'`, order by `paidAt desc`, limit 5 — type `payment`
3. `gradebooks` where `status='published'`, order by `publishedAt desc`, limit 5 — type `result_published`

No `audit_logs` dependency.

---

## 6. TypeScript Types

Add to `frontend/src/types/index.ts`:

```ts
interface DashboardStats {
  // existing fields +
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

## 7. File Change Summary

| File | Change |
|---|---|
| `frontend/src/components/AdminLayout.tsx` | **Create** |
| `frontend/src/pages/admin/AdminDashboard.tsx` | **Rewrite** |
| `frontend/src/pages/admin/UserListPage.tsx` | Remove nav, wrap in AdminLayout |
| `frontend/src/pages/admin/CreateUserPage.tsx` | Remove nav, wrap in AdminLayout |
| `frontend/src/pages/admin/GradebookListPage.tsx` | Remove nav, wrap in AdminLayout |
| `frontend/src/pages/admin/CreateGradebookPage.tsx` | Remove nav, wrap in AdminLayout |
| `frontend/src/pages/admin/GradebookDetailPage.tsx` | Remove nav, wrap in AdminLayout |
| `frontend/src/pages/admin/GradeEntryPage.tsx` | Remove nav, wrap in AdminLayout |
| `frontend/src/types/index.ts` | Extend `DashboardStats` |
| `backend/src/modules/admin/admin.service.ts` | Extend `getDashboard()` |
| `backend/src/modules/admin/admin.controller.ts` | No change (pass-through) |

---

## 8. Implementation Order

1. Backend: extend `getDashboard()` service + update types
2. Frontend types: extend `DashboardStats`
3. Create `AdminLayout` component
4. Wrap all existing admin pages in `AdminLayout`
5. Rewrite `AdminDashboard.tsx` (KPI cards → charts → alerts → activity)
6. TypeScript check + commit
