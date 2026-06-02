# Payment Status Dashboard — Design Spec
**Date:** 2026-06-02  
**Status:** Approved

---

## Overview

Two new features surfacing payment compliance on the admin dashboard:

1. **Dashboard payment stats widget** — a new full-width card below the charts row showing mini donuts for NACOS Dues and Result Subscription paid/unpaid counts, scoped to the department's current session/semester.
2. **Payment status detail pages** — two full-page admin views (`/admin/payments/nacos-dues` and `/admin/payments/result-sub`) listing every student with their payment status, filterable by program, level, session, semester; with PDF export.

---

## 1. Dashboard Widget

### Backend — extend `getDashboardStats`

**File:** `backend/src/modules/admin/admin.service.ts`

Add two new fields to the return type of `getDashboardStats()`:

```typescript
nacosPaymentStats: {
  paid:     number;   // students with success nacos_dues payment for currentSession
  unpaid:   number;   // totalStudents - paid
  session:  string;   // department.currentSession (e.g. "2024/2025")
};
resultSubStats: {
  paid:     number;   // students with success result_subscription for currentSession + currentSemester
  unpaid:   number;
  session:  string;
  semester: string;   // department.currentSemester (e.g. "first")
};
```

**Queries (added to the existing `Promise.all` block):**

```typescript
// Fetch department settings for currentSession/currentSemester
const dept = await this.db.department.findUnique({ where: { id: departmentId } });

// NACOS dues paid count
const nacosPaid = await this.db.payment.count({
  where: {
    type: 'nacos_dues',
    status: 'success',
    sessionYear: dept.currentSession,
    user: { departmentId },
  },
});

// Result sub paid count (per session + semester)
const resultSubPaid = await this.db.payment.count({
  where: {
    type: 'result_subscription',
    status: 'success',
    sessionYear: dept.currentSession,
    semester: dept.currentSemester as Semester,
    user: { departmentId },
  },
});
```

Unpaid = `totalStudents - paid` for each.

If `currentSession` or `currentSemester` is null (not yet configured), return `{ paid: 0, unpaid: 0, session: '—', semester: '—' }`.

### Frontend — new payment stats card

**File:** `frontend/src/pages/admin/AdminDashboard.tsx`

New `PaymentDonut` component (two-segment: green for paid, gray for unpaid):

```tsx
function PaymentDonut({ paid, unpaid }: { paid: number; unpaid: number }) {
  const total = paid + unpaid;
  if (total === 0) return <div className="h-20 flex items-center justify-center text-xs text-gray-400">No data</div>;
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
```

New full-width card added after the charts row (currently ends around line 396):

- Card: `bg-white rounded-2xl border border-gray-200 p-5 shadow-sm`
- Header: "Payment Compliance" + session/semester subtitle
- Two panels side by side (responsive: stacked on mobile):
  - **NACOS Dues**: `PaymentDonut` + "X paid / Y unpaid" + `Link` to `/admin/payments/nacos-dues?session=<currentSession>`
  - **Result Sub**: `PaymentDonut` + counts + `Link` to `/admin/payments/result-sub?session=<currentSession>&semester=<currentSemester>`
- Each panel has a subtle left border (`border-l-4`) — amber for NACOS dues, blue for result sub
- Entire panel is wrapped in a `Link` (clickable card)
- The session/semester are appended as query params so the detail page pre-fills its filters automatically

**Types — `frontend/src/types/index.ts`:**

Add to `DashboardStats`:
```typescript
nacosPaymentStats: { paid: number; unpaid: number; session: string };
resultSubStats:    { paid: number; unpaid: number; session: string; semester: string };
```

---

## 2. Payment Status Detail Pages

### Backend — new payment status service

**File:** `backend/src/modules/admin/payment-status.service.ts` (new)

Single service with four methods:

```typescript
interface PaymentStatusStudent {
  id: string;
  userId: string;
  name: string;
  program: string;
  level: string;
  hasPaid: boolean;
  paidAt: string | null;
  amount: number | null;
  reference: string | null;
}

interface PaymentStatusQuery {
  program?: string;
  level?: string;
  session?: string;
  semester?: string;
  status?: 'paid' | 'unpaid' | 'all';
  page?: number;
  limit?: number;
}

class PaymentStatusService {
  async getNacosStudents(departmentId, query): Promise<{ data: PaymentStatusStudent[]; meta: PaginationMeta }>
  async getResultSubStudents(departmentId, query): Promise<{ data: PaymentStatusStudent[]; meta: PaginationMeta }>
  async exportNacosPdf(departmentId, query): Promise<Buffer>
  async exportResultSubPdf(departmentId, query): Promise<Buffer>
}
```

**Query pattern** (same for both, differs only in `type` and `semester` filter):

```typescript
// 1. Fetch all students matching program/level filters
const students = await this.db.user.findMany({
  where: { departmentId, role: 'student', program?, level? },
  orderBy: { name: 'asc' },
});

// 2. Fetch all matching successful payments for the session
const payments = await this.db.payment.findMany({
  where: {
    type: 'nacos_dues',  // or 'result_subscription'
    status: 'success',
    sessionYear: session,
    semester?,           // only for result_subscription
    user: { departmentId },
  },
});

// 3. Build a userId → payment map, merge with students
const paymentMap = new Map(payments.map(p => [p.userId, p]));
const merged = students.map(s => ({
  ...s,
  hasPaid: paymentMap.has(s.id),
  paidAt: paymentMap.get(s.id)?.paidAt ?? null,
  amount: paymentMap.get(s.id)?.amount ?? null,
  reference: paymentMap.get(s.id)?.reference ?? null,
}));

// 4. Filter by status (paid/unpaid/all), paginate
```

**PDF generation** uses PDFKit (same pattern as `exportStudentLoginsPdf` in `admin.controller.ts`). Columns: #, Student ID, Name, Program, Level, Status, Paid Date. Green header bar, alternating row colors, branded footer.

### Backend — new routes

**File:** `backend/src/modules/admin/admin.routes.ts` (add to existing)

```
GET /api/v1/admin/payments/nacos-dues/students
GET /api/v1/admin/payments/nacos-dues/students/export.pdf
GET /api/v1/admin/payments/result-sub/students
GET /api/v1/admin/payments/result-sub/students/export.pdf
```

All routes: `authenticate + requireAdmin + apiRateLimit`. No extra permission gate (all admin roles can view payment compliance).

New controller file: `backend/src/modules/admin/payment-status.controller.ts`

### Frontend — two new pages

**Files:**
- `frontend/src/pages/admin/NacosDuesStatusPage.tsx` (new)
- `frontend/src/pages/admin/ResultSubStatusPage.tsx` (new)

Both pages share the same layout — only differences are title, columns (result sub adds "Semester"), and API endpoint called. Extract a shared `PaymentStatusTable` component if the pages are too similar (YAGNI — skip if copy-paste is cleaner).

**Page layout:**
- Back arrow → `/admin/dashboard`
- Title + subtitle (paid/unpaid counts)
- Filter bar: Program select, Level select, Session text input, Status select (All/Paid/Unpaid), [+ Semester select for result sub], Clear button
- Default filters pre-populated from URL query params (set when clicking dashboard widget)
- Student table with columns: Student (name), Student ID, Program, Level, [Semester], Status badge (green "Paid" / red "Unpaid"), Paid Date
- Pagination
- "Download PDF" button → calls export endpoint with current filters

**Routes added to `frontend/src/App.tsx`:**
```tsx
<Route path="payments/nacos-dues"  element={<NacosDuesStatusPage />} />
<Route path="payments/result-sub"  element={<ResultSubStatusPage />} />
```

**API client additions (`frontend/src/api/client.ts`):**
```typescript
export const paymentStatusApi = {
  getNacosStudents: (params?: Record<string, string | number>) =>
    api.get<{ success: true; data: PaymentStatusStudent[]; meta: PaginationMeta }>(
      '/admin/payments/nacos-dues/students', { params }
    ),
  getResultSubStudents: (params?: Record<string, string | number>) =>
    api.get<{ success: true; data: PaymentStatusStudent[]; meta: PaginationMeta }>(
      '/admin/payments/result-sub/students', { params }
    ),
  exportNacosPdf: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    window.open(`${api.defaults.baseURL}/admin/payments/nacos-dues/students/export.pdf${qs}`, '_blank');
  },
  exportResultSubPdf: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    window.open(`${api.defaults.baseURL}/admin/payments/result-sub/students/export.pdf${qs}`, '_blank');
  },
};
```

`PaymentStatusStudent` must be exported from `frontend/src/types/index.ts`.

---

## Files Changed Summary

### Backend
- `backend/src/modules/admin/admin.service.ts` — extend `getDashboardStats` with payment stat queries
- `backend/src/modules/admin/payment-status.service.ts` — new service
- `backend/src/modules/admin/payment-status.controller.ts` — new controller
- `backend/src/modules/admin/admin.routes.ts` — 4 new routes

### Frontend
- `frontend/src/types/index.ts` — extend `DashboardStats` with new fields
- `frontend/src/pages/admin/AdminDashboard.tsx` — new `PaymentDonut` component + payment compliance card
- `frontend/src/pages/admin/NacosDuesStatusPage.tsx` — new page
- `frontend/src/pages/admin/ResultSubStatusPage.tsx` — new page
- `frontend/src/App.tsx` — 2 new routes
- `frontend/src/api/client.ts` — `paymentStatusApi`

---

## Verification

1. **Dashboard widget** — log in as any admin role, confirm the "Payment Compliance" card appears below the charts. Verify the paid/unpaid numbers match what's in the DB for `currentSession`. Click each mini donut panel — confirm navigation to the correct detail page.
2. **NACOS Dues detail page** — filter by program "CSC" + status "Unpaid" → only CSC students without a nacos_dues payment appear. Change session to a different year → counts change.
3. **Result Sub detail page** — same filter tests; confirm "Semester" column appears and semester filter works.
4. **PDF export** — click "Download PDF" with active filters → PDF downloads, contains the filtered student list with correct columns and branding.
5. **Null session guard** — set department `currentSession` to null → dashboard widget shows "—" with 0 counts; no crash.
