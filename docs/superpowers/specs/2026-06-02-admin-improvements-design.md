# Admin Portal Improvements — Design Spec
**Date:** 2026-06-02  
**Status:** Approved

---

## Overview

Five improvements to the admin portal:

1. Dashboard recent activity — timestamps + "View All Activity" page
2. Registration sidebar — red pill badge showing pending count
3. Notification composer — image/flyer upload
4. Audit log — full coverage across all admin actions + visible to all roles
5. README — print seeded course adviser credentials

---

## 1. Dashboard: Timestamps + "View All Activity"

### Frontend

**`AdminDashboard.tsx`:**
- Each activity row displays relative time ("2 mins ago") + absolute date ("Jun 2, 2026") beneath the label, derived from the existing ISO `time` field.
- Footer of the activity card gets a "View All Activity →" button → navigates to `/admin/activity`.

**New page `ActivityLogPage.tsx`** at `/admin/activity`:
- Paginated feed of all activity events: `registered`, `activated`, `payment`, `result_published`.
- Filter bar: type selector + date range (from/to).
- Same bordered-row card style as the dashboard feed.
- Accessible to all admin roles (no role gate).
- Added to `App.tsx` routes and reachable via the dashboard button (not in sidebar nav).

### Backend

**New endpoint:** `GET /api/v1/admin/dashboard/activity`

Query params: `page` (default 1), `limit` (default 20), `type?`, `from?`, `to?`

Response:
```json
{
  "success": true,
  "data": [
    { "type": "registered", "label": "John Doe registered", "time": "2026-06-02T10:23:00Z" }
  ],
  "meta": { "page": 1, "limit": 20, "total": 84 }
}
```

Implementation: paginated version of the multi-source merge already in `getDashboardStats` (registered users, successful payments, published gradebooks). Optional `type` filter narrows to one source. Date range filters on the merged `time` field.

---

## 2. Sidebar Registration Badge

### Backend

**New endpoint:** `GET /api/v1/registration/admin/pending-count`

Response: `{ "success": true, "data": { "count": 7 } }`

Count = pending `course_form` + pending `school_fee_receipt` registrations for the admin's department.

### Frontend

**New hook `usePendingRegistrations()`:**
- Calls the endpoint on mount.
- Polls every 60 s via `setInterval`.
- Clears interval on unmount.
- Re-fetches immediately when the current path is `/admin/registrations`.

**`AdminLayout.tsx`:**
- Registrations nav item gets a red pill badge (`bg-red-500 text-white text-xs`) whenever `count > 0`.
- Displays the raw count up to 99; shows `99+` beyond that.

---

## 3. Notification Image Upload

### Schema

One new nullable field on `Notification`:
```prisma
imageUrl  String?  @map("image_url")  @db.VarChar(500)
```
New Prisma migration required.

### Backend

- `POST /api/v1/admin/notifications` switches from `express.json()` to `multer` (memory storage, 5 MB max, JPG/PNG only).
- Fields sent as multipart form fields; `image` as the file field name.
- If `image` present: `uploadToS3(file, 'notifications')` → stores `imageUrl` on the record.
- `imageUrl` included in all `AdminNotification` response objects (null when absent).
- No changes to send/delete/list endpoints beyond including `imageUrl` in responses.

### Frontend (`AdminNotificationsPage.tsx`)

- Dashed dropzone added below the message textarea, labelled "Attach Flyer (optional)". Shows file type hint: "JPG, PNG — max 5 MB".
- After file selection: dropzone replaced by a single-row preview showing filename + "✕ Remove" link.
- Form submission: `FormData` when an image is attached; plain JSON body otherwise.
- Notification list items (sent + drafts): small `<img>` thumbnail (48×48) shown on the right if `imageUrl` is present.

---

## 4. Audit Log: Full Coverage

### Visibility change

Audit Logs page (`/admin/audit-logs`) currently gated to HOD only.

New behaviour:
- **All admin roles** can see the page.
- Non-HOD admins: service receives `actorIdFilter = req.user.id` → sees only own trail.
- HOD: no filter → sees all admins' trails.
- Sidebar item moved from `System > HOD-only` to `System` (visible to all).

### Missing audit events

All calls follow the existing `logAudit(prisma, { actorId, action, entityType, entityId, newValue, ipAddress, userAgent })` pattern.

| Module | Service file | New actions |
|--------|-------------|-------------|
| Registration | `registration.service.ts` | `REGISTRATION_SUBMITTED`, `REGISTRATION_APPROVED`, `REGISTRATION_REJECTED` |
| Notifications | `notifications-admin.service.ts` | `NOTIFICATION_CREATED`, `NOTIFICATION_SENT`, `NOTIFICATION_DELETED` |
| Gradebook | `gradebook.service.ts` | `GRADEBOOK_CREATED`, `GRADEBOOK_DELETED` |
| Elections | `election.service.ts` | `ELECTION_CREATED`, `ELECTION_OPENED`, `ELECTION_CLOSED`, `CANDIDATE_ADDED` |
| Auth | `auth.service.ts` | `ADMIN_LOGIN`, `ADMIN_LOGOUT`, `STUDENT_PASSWORD_RESET` |
| Students | `admin.service.ts` | `BULK_STUDENTS_IMPORTED`, `STUDENT_REACTIVATED` |

`entityType` values: `registration`, `notification`, `gradebook`, `election`, `user`, `auth`.  
`entityId`: the affected record's UUID.  
`newValue`: relevant snapshot (e.g. `{ status: 'verified' }` for `REGISTRATION_APPROVED`).

---

## 5. README: Course Adviser Credentials

A new `## Default Admin Credentials` section added to `README.md` listing the seeded HOD and Course Adviser login pairs (matric number / password) sourced from the seed script. Exact values resolved at implementation time by reading the seed file.

---

## Files Changed (summary)

### Backend
- `prisma/schema.prisma` — add `imageUrl` to `Notification`
- New migration: `add_notification_image_url`
- `src/modules/admin/admin.service.ts` — paginated activity endpoint + `BULK_STUDENTS_IMPORTED`, `STUDENT_REACTIVATED`
- `src/modules/admin/admin.controller.ts` — new `getActivity` handler
- `src/modules/admin/admin.routes.ts` — `GET /dashboard/activity`
- `src/modules/registration/registration.service.ts` — pending count + audit events
- `src/modules/registration/registration.controller.ts` — `getPendingCount` handler
- `src/modules/registration/registration.routes.ts` — `GET /admin/pending-count`
- `src/modules/notifications/notifications-admin.service.ts` — `imageUrl` + audit events
- `src/modules/notifications/notifications-admin.controller.ts` — multer upload
- `src/modules/notifications/notifications-admin.routes.ts` — multer middleware
- `src/modules/gradebook/gradebook.service.ts` — `GRADEBOOK_CREATED`, `GRADEBOOK_DELETED`
- `src/modules/elections/election.service.ts` — election audit events
- `src/modules/auth/auth.service.ts` — `ADMIN_LOGIN`, `ADMIN_LOGOUT`, `STUDENT_PASSWORD_RESET`

### Frontend
- `src/pages/admin/AdminDashboard.tsx` — timestamps + View All Activity button
- `src/pages/admin/ActivityLogPage.tsx` — new page
- `src/components/AdminLayout.tsx` — registration badge + audit log visibility
- `src/pages/admin/AdminNotificationsPage.tsx` — image upload dropzone
- `src/App.tsx` — add `/admin/activity` route
- `src/api/client.ts` — new API calls (activity feed, pending count)
- `src/types/index.ts` — updated types

### Other
- `README.md` — default admin credentials section
