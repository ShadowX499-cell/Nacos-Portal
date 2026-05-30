# Admin Notifications, Settings & Profile — Design Spec
**Date:** 2026-05-30
**Status:** Approved
**Sub-project:** C of A→B→C (Admin Dashboard → Elections → Notifications/Settings/Profile)

---

## 1. Goal

Build three missing admin pages: a notifications composer/list, a settings page (department config + preferences), and a profile page. These complete the admin sidebar — every nav link currently live or unlocked will have a real page behind it.

---

## 2. Scope

### In scope
- **Admin Profile** (`/admin/profile`) — view-only display of admin account info; change password link
- **Admin Notifications** (`/admin/notifications`) — single page: inline compose panel + sent/drafts list; 4 new backend endpoints
- **Admin Settings** (`/admin/settings`) — two-tab page: Department tab (backend-backed, editable session/semester) + Preferences tab (localStorage toggles)
- Schema migration: 2 new nullable columns on `Department` (`currentSession`, `currentSemester`)
- `AdminLayout` sidebar footer becomes a link to `/admin/profile`
- Route registrations in `App.tsx`

### Out of scope
- Admin editing their own name/email (managed via user management)
- Real email delivery for preference toggles (toggles are stored only; email integration is Phase 3)
- Notification scheduling / future-dated sends
- Push notifications / WebSocket real-time delivery
- Individual student search for targeting (target "Individual" field deferred — only All/Level in scope)

---

## 3. Admin Profile

### 3.1 Route
`/admin/profile` — protected, admin/super_admin only.

### 3.2 Data source
Reuses `GET /api/v1/auth/me` (existing `profileApi.getMe()`). Works for admins today — no new backend endpoint needed.

### 3.3 UI
- Avatar (initials, green gradient) + name + userId + role badge
- Info rows: Full Name, Admin ID (monospace), Email Address, Role, Department
- "Account" card below with `Change Password →` link → `/auth/forgot-password`
- Matches visual style of student `ProfilePage` but with brand-green gradient avatar

### 3.4 Navigation hook
`AdminLayout` sidebar footer: clicking the admin avatar/name block navigates to `/admin/profile` (wrap in `<Link>`).

### 3.5 Files
| File | Action |
|---|---|
| `frontend/src/pages/admin/AdminProfilePage.tsx` | **Create** |
| `frontend/src/components/AdminLayout.tsx` | Wrap footer avatar+name in `<Link to="/admin/profile">` |
| `frontend/src/App.tsx` | Add `<Route path="/admin/profile" element={<AdminProfilePage />} />` |

---

## 4. Admin Notifications

### 4.1 Route
`/admin/notifications` — single page (no sub-routes).

### 4.2 Backend — new endpoints (added to `admin.routes.ts`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/admin/notifications` | Create notification (draft or send immediately) |
| `GET` | `/api/v1/admin/notifications` | List all notifications for dept (`?status=sent\|draft`) |
| `PATCH` | `/api/v1/admin/notifications/:id/send` | Promote draft → sent (sets `isSent = true`) |
| `DELETE` | `/api/v1/admin/notifications/:id` | Delete a draft (sent notifications cannot be deleted) |

**Create body:**
```ts
{
  title: string;          // 3–200 chars
  body: string;           // 10–2000 chars
  type: 'general' | 'result' | 'election' | 'payment' | 'system';
  target: 'all' | 'level';
  targetLevel?: 'L100' | 'L200' | 'L300' | 'L400';  // required if target === 'level'
  send: boolean;          // true = send now, false = save as draft
}
```

**Note:** `target: 'individual'` is deferred (out of scope). The `targetUserId` field exists in the schema but won't be exposed in this phase.

**List response shape:**
```ts
{
  id: string;
  title: string;
  body: string;
  type: string;
  target: string;
  targetLevel: string | null;
  isSent: boolean;
  recipientCount: number;   // count of matching users at send time
  createdAt: string;
  sentAt: string | null;
}
```

`recipientCount`: computed at list time by counting `User` records matching `departmentId` + target criteria (not stored — always fresh).

### 4.3 Backend service methods (new, in existing `NotificationsService` or new `AdminNotificationsService`)
- `createNotification(dto, adminId, departmentId): Promise<NotificationPublic>`
- `listAdminNotifications(departmentId, status?: 'sent' | 'draft'): Promise<NotificationPublic[]>`
- `sendNotification(id, departmentId): Promise<NotificationPublic>`
- `deleteNotification(id, departmentId): Promise<void>`

Implementation lives in `backend/src/modules/notifications/` alongside existing service, in a new `notifications-admin.service.ts` file to avoid touching the student service.

### 4.4 Frontend UI

**Compose panel** (AnimatePresence, collapsed by default):
- "New Notification" button in page header → expands compose panel with animated height
- Fields: Title (text), Message (textarea), Type (select), Target (select: All / L100 / L200 / L300 / L400)
- Buttons: "Save Draft" and "Send Now →"
- Compose panel closes after successful send or save

**List** (below compose):
- Two tabs: **Sent** (count badge) and **Drafts** (count badge)
- Each row: type emoji + title + timestamp + target summary + status badge
- Drafts tab: rows show "Send" button + "Delete" button
- Empty states for both tabs

### 4.5 Files
| File | Action |
|---|---|
| `backend/src/modules/notifications/notifications-admin.service.ts` | **Create** |
| `backend/src/modules/notifications/notifications-admin.controller.ts` | **Create** |
| `backend/src/modules/notifications/notifications-admin.validation.ts` | **Create** |
| `backend/src/modules/admin/admin.routes.ts` | Add 4 admin notification routes |
| `frontend/src/api/client.ts` | Add `adminNotificationsApi` |
| `frontend/src/types/index.ts` | Add `AdminNotification` type |
| `frontend/src/pages/admin/AdminNotificationsPage.tsx` | **Create** |
| `frontend/src/App.tsx` | Add route |

---

## 5. Admin Settings

### 5.1 Route
`/admin/settings` — single page, two tabs.

### 5.2 Schema migration
Add two nullable columns to `Department`:

```prisma
model Department {
  // existing fields...
  currentSession  String?  @map("current_session") @db.VarChar(20)   // e.g. "2024/2025"
  currentSemester Semester? @map("current_semester")                  // reuse existing Semester enum
}
```

Migration name: `add_department_session_fields`

### 5.3 Backend — new endpoints (added to `admin.routes.ts`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/admin/settings/department` | Read dept record (name, code, faculty, currentSession, currentSemester) |
| `PATCH` | `/api/v1/admin/settings/department` | Update currentSession and/or currentSemester only |

**PATCH body:**
```ts
{
  currentSession?: string;    // e.g. "2024/2025" — validated as "YYYY/YYYY"
  currentSemester?: 'first' | 'second';
}
```

`name`, `code`, `faculty` are returned by GET but are **read-only** — PATCH ignores them.

### 5.4 Tab 1 — Department
- Reads from `GET /api/v1/admin/settings/department`
- Read-only display: Department Name, Code, Faculty
- Editable dropdowns: Current Session (text input with format hint e.g. "2024/2025"), Semester (First / Second)
- "Save Changes" → `PATCH /api/v1/admin/settings/department`
- Success toast/inline confirmation

### 5.5 Tab 2 — Preferences
Four toggle rows (stored in `localStorage` under key `nacos_admin_prefs`):

| Key | Label | Default |
|---|---|---|
| `emailOnRegistration` | New student registration | `true` |
| `emailOnPayment` | Payment received | `false` |
| `emailOnNomination` | New election nomination | `true` |
| `emailOnGrade` | Grade published | `false` |

Toggles update `localStorage` immediately on click (no save button needed). Note displayed: "Preferences are saved to this browser."

### 5.6 Files
| File | Action |
|---|---|
| `backend/prisma/schema.prisma` | Add `currentSession` + `currentSemester` to `Department` |
| `backend/prisma/migrations/` | New migration: `add_department_session_fields` |
| `backend/src/modules/admin/admin.routes.ts` | Add 2 settings endpoints |
| `backend/src/modules/admin/admin.service.ts` | Add `getDepartmentSettings`, `updateDepartmentSettings` |
| `backend/src/modules/admin/admin.controller.ts` | Add `getDepartmentSettings`, `updateDepartmentSettings` handlers |
| `frontend/src/api/client.ts` | Add `adminSettingsApi` |
| `frontend/src/types/index.ts` | Add `DepartmentSettings` type |
| `frontend/src/pages/admin/AdminSettingsPage.tsx` | **Create** |
| `frontend/src/App.tsx` | Route already exists as dead link — connect it |

---

## 6. API Conventions
All new endpoints follow existing conventions:
- Auth: `Authorization: Bearer <token>` + `requireAdmin` middleware
- Success: `{ success: true, data: {...}, message: "..." }`
- Error: `{ success: false, error: { code: "...", message: "..." } }`
- All routes wrapped in `asyncHandler`

---

## 7. File Change Summary

| File | Action |
|---|---|
| `backend/prisma/schema.prisma` | Add 2 columns to Department |
| `backend/prisma/migrations/` | Migration: add_department_session_fields |
| `backend/src/modules/notifications/notifications-admin.service.ts` | Create |
| `backend/src/modules/notifications/notifications-admin.controller.ts` | Create |
| `backend/src/modules/notifications/notifications-admin.validation.ts` | Create |
| `backend/src/modules/admin/admin.routes.ts` | Add 6 new routes (4 notifications + 2 settings) |
| `backend/src/modules/admin/admin.service.ts` | Add 2 settings methods |
| `backend/src/modules/admin/admin.controller.ts` | Add 2 settings handlers |
| `frontend/src/types/index.ts` | Add AdminNotification + DepartmentSettings types |
| `frontend/src/api/client.ts` | Add adminNotificationsApi + adminSettingsApi |
| `frontend/src/pages/admin/AdminProfilePage.tsx` | Create |
| `frontend/src/pages/admin/AdminNotificationsPage.tsx` | Create |
| `frontend/src/pages/admin/AdminSettingsPage.tsx` | Create |
| `frontend/src/components/AdminLayout.tsx` | Wrap sidebar footer in Link to /admin/profile |
| `frontend/src/App.tsx` | Add 2 new routes (/admin/profile, /admin/notifications connected) |
