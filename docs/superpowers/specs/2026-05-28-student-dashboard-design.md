# Student Dashboard Design Spec

**Date:** 2026-05-28  
**Status:** Approved  
**Scope:** Complete student-facing portal — layout shell, all pages, new backend endpoints

---

## Overview

Replace the current fragmented student pages (each with its own isolated nav) with a cohesive university portal using a shared `StudentLayout` shell (fixed sidebar + topbar). Adds six new pages, refactors three existing ones, and adds backend support for profile lookup, course registration, notifications, and school fees payments.

---

## Decisions Summary

| Decision | Choice |
|---|---|
| Shell layout | Fixed sidebar with labeled nav items |
| Dashboard home | 4 stat cards + Recent Results panel + Action Required panel + Quick Actions |
| Transcript style | Academic table with running CGPA column |
| New sections | School Fees, Course Registration, Notifications |
| Course form storage | AWS S3 (already planned for Phase 2+) |

---

## Full Navigation Structure

```
Dashboard          /student/dashboard
My Results         /student/results
Transcript         /student/transcript

── Finance ─────────────────────────
School Fees        /student/school-fees
Payments           /student/payments

── Academic ────────────────────────
Registration       /student/registration
Elections          /student/elections

── Account ─────────────────────────
Notifications      /student/notifications
Profile            /student/profile
```

---

## Architecture

### React Route Nesting (`App.tsx`)

```tsx
<Route element={<ProtectedRoute roles={['student']} />}>

  {/* Shell wraps all content pages */}
  <Route element={<StudentLayout />}>
    <Route path="/student/dashboard"      element={<StudentDashboard />} />
    <Route path="/student/results"        element={<ResultsHomePage />} />
    <Route path="/student/results/:gradebookId" element={<ResultDetailPage />} />
    <Route path="/student/transcript"     element={<TranscriptPage />} />
    <Route path="/student/school-fees"    element={<SchoolFeesPage />} />
    <Route path="/student/payments"       element={<PaymentsPage />} />
    <Route path="/student/registration"   element={<RegistrationPage />} />
    <Route path="/student/elections"      element={<ElectionsPage />} />
    <Route path="/student/notifications"  element={<NotificationsPage />} />
    <Route path="/student/profile"        element={<ProfilePage />} />
  </Route>

  {/* Full-screen — no shell */}
  {/* returnTo query param controls redirect: ?returnTo=/student/results or ?returnTo=/student/school-fees */}
  <Route path="/student/results/verify"     element={<PaymentVerifyPage />} />
  <Route path="/student/school-fees/verify" element={<PaymentVerifyPage />} />

</Route>
```

### Frontend File Map

**New files:**
```
frontend/src/
├── components/
│   └── StudentLayout.tsx             ← sidebar + topbar shell (shared Outlet)
├── pages/student/
│   ├── StudentDashboard.tsx          ← home page
│   ├── TranscriptPage.tsx            ← academic table
│   ├── SchoolFeesPage.tsx            ← school fees payment
│   ├── PaymentsPage.tsx              ← result subscription history
│   ├── RegistrationPage.tsx          ← course form upload + status
│   ├── ElectionsPage.tsx             ← placeholder (Phase 3)
│   ├── NotificationsPage.tsx         ← notification list + mark read
│   └── ProfilePage.tsx               ← student info read-only
```

**Refactored (remove inline `<nav>`, content only):**
```
frontend/src/pages/student/
├── ResultsHomePage.tsx               ← remove <nav> block
└── ResultDetailPage.tsx              ← remove <nav> block
```

---

## Backend Changes

### 1. `GET /api/v1/auth/me` — Student profile

The JWT payload only contains `sub`, `userId`, `role`, `departmentId`. The dashboard needs `name`, `level`, `program`, `email`. A simple new endpoint:

- **Route:** `GET /api/v1/auth/me`
- **Auth:** `authenticate` (any role)
- **Returns:** Full `UserPublic` for the authenticated user

Added to `auth.routes.ts` + `auth.service.ts`.

---

### 2. Course Registration — New Prisma model + endpoints

**Prisma schema addition:**
```prisma
enum RegistrationStatus {
  pending
  verified
  rejected
}

model CourseRegistration {
  id           String             @id @default(uuid())
  userId       String             @map("user_id")
  session      String             @db.VarChar(20)
  semester     Semester
  fileUrl      String?            @map("file_url") @db.VarChar(500)
  status       RegistrationStatus @default(pending)
  reviewedById String?            @map("reviewed_by")
  reviewNote   String?            @map("review_note") @db.VarChar(500)
  submittedAt  DateTime           @default(now()) @map("submitted_at")
  reviewedAt   DateTime?          @map("reviewed_at")

  user       User  @relation(fields: [userId], references: [id])
  reviewedBy User? @relation("ReviewedRegistrations", fields: [reviewedById], references: [id])

  @@unique([userId, session, semester])
  @@map("course_registrations")
}
```

**Student endpoints** (`/api/v1/registration`):
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/registration` | List student's registrations |
| `POST` | `/api/v1/registration` | Upload course form (multipart, S3) |
| `GET` | `/api/v1/registration/:id` | Get single registration status |

**Admin endpoints** (`/api/v1/admin/registrations`):
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/admin/registrations` | List all registrations (filter by status, session, semester) |
| `PATCH` | `/api/v1/admin/registrations/:id/review` | Mark verified or rejected with note |

**File upload:** Multer → AWS S3. Returns S3 URL stored in `fileUrl`. Students can view/replace their form while `status = pending`.

---

### 3. Notifications — New endpoints

Schema models `Notification` and `NotificationRead` already exist.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | student | List notifications for student's dept/level, with `isRead` flag |
| `POST` | `/api/v1/notifications/:id/read` | student | Mark notification as read |
| `GET` | `/api/v1/notifications/unread-count` | student | Returns `{ count: N }` for topbar badge |

New module: `backend/src/modules/notifications/`

---

### 4. School Fees — New endpoint

`PaymentType.school_fees` already exists in the schema.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/payments/school-fees/initiate` | student | Start Paystack txn for school fees |
| `GET` | `/api/v1/payments/school-fees/status` | student | Current session payment status |

Amount configured via `SCHOOL_FEES_AMOUNT_KOBO` env var.

---

## StudentLayout Component

**Sidebar sections:**

```
Logo: NACOS Portal / Student

── Main ─────────────
🏠 Dashboard           /student/dashboard
📋 My Results          /student/results
📈 Transcript          /student/transcript

── Finance ──────────
🏫 School Fees         /student/school-fees   [badge: UNPAID if not paid]
💳 Payments            /student/payments      [badge: N pending]

── Academic ─────────
📝 Registration        /student/registration  [badge: status]
🗳️  Elections          /student/elections

── Account ──────────
🔔 Notifications       /student/notifications  [badge: unread count]
👤 Profile             /student/profile

── Footer ───────────
[Avatar] Name / StudentID / Sign out
```

**Topbar:** Breadcrumb path | Current session badge | 🔔 bell with unread dot | Sign out

**Active state:** White background + white text, slightly elevated. All others: 65% white opacity text, hover at 80%.

---

## Page Designs

### StudentDashboard

**Data sources:** `GET /auth/me` + `GET /results` (GPA list) + `GET /notifications/unread-count` + `GET /payments` (pending check) + `GET /registration` (status check)

**Layout:**
1. **Greeting:** "Good morning, [Name] 👋" + "Programme · Level · Session"
2. **4 stat cards:** CGPA · Credits Earned · Current Level · Semesters Done
3. **Two panels side by side:**
   - **Recent Results:** last 3 paid results, SGPA pill (green/blue), View → link
   - **Action Required:** dynamically built list — payment pending alerts, new result published, registration status, unread notification count
4. **Quick Actions row:** 5 icon-button shortcuts → Results, Pay Fees, Transcript, Elections, Profile

---

### ResultsHomePage *(refactored)*

Remove `<nav>` block. Keep existing content: grouped result list, green left border = paid (View), gray = unpaid (Pay ₦500).

---

### ResultDetailPage *(refactored)*

Remove `<nav>` block. Keep: SGPA/CGPA/Credits stat cards + grade table.

---

### TranscriptPage

**Data:** `GET /results/gpa` (returns all paid semesters + CGPA)

**Layout:**
- Header: "Academic Transcript · [Name] · CGPA: X.XX" + Print button
- Table columns: Session | Semester | Level | Credits Earned | SGPA | Running CGPA
- Row for each paid semester, ordered oldest → newest
- Tfoot: Total Credits | — | — | N | — | Final CGPA
- Print CSS: hide sidebar/topbar, show only table

---

### SchoolFeesPage

**Data:** `GET /payments/school-fees/status` — "current session" is derived from the latest published gradebook's session for the student's department. If no gradebook exists, defaults to the current calendar year formatted as `YYYY/YYYY+1`.

**Layout:**
- Current session status card: `PAID ✓` (green) or `UNPAID ✗` (orange with Pay button)
- Amount displayed: ₦X,XXX
- If paid: receipt reference, payment date
- If unpaid: "Pay Now" button → Paystack redirect → verify page
- History table: past sessions and their fee status

---

### PaymentsPage

**Data:** `GET /payments` (result subscription history)

**Layout:**
- Table: Date | Type | Session/Semester | Amount | Reference | Status badge
- Status badges: success (green), pending (yellow), failed (red)
- Empty state: "No payments yet"

---

### RegistrationPage

**Data:** `GET /registration`

**Layout:**
- Current semester registration card:
  - Status badge: Pending (yellow) | Verified ✓ (green) | Rejected ✗ (red)
  - If rejected: rejection note shown in a red alert box
  - Upload area: drag-and-drop or file picker (PDF/JPG/PNG, max 5MB)
  - "Submit Registration Form" button (disabled once verified)
- History section: table of past registrations per session/semester

---

### ElectionsPage

**Layout (Phase 3 placeholder):**
- Header: "Departmental Elections"
- Empty state card: 🗳️ illustration + "No active elections at the moment." + "When the department opens an election, you will see it here and receive a notification."
- Styled consistently — not a blank page

---

### NotificationsPage

**Data:** `GET /notifications` — returns list with `isRead` flag

**Layout:**
- "Mark all as read" button (top right)
- List of notification cards, newest first:
  - Unread: white background, left blue border, bold title
  - Read: gray-50 background, normal weight
  - Each card: icon by type (result=📋, payment=💳, election=🗳️, general=📣) + title + body + time ago
- Empty state: "No notifications yet"

---

### ProfilePage

**Data:** `GET /auth/me`

**Layout:**
- Student info card (read-only):
  - Full Name, Student ID, Email, Phone, Programme, Level, Department
- Account section:
  - "Change Password" → navigates to `/auth/forgot-password`

---

## New Environment Variables

```bash
# backend/.env
SCHOOL_FEES_AMOUNT_KOBO=150000   # ₦1,500 default
```

---

## Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `REGISTRATION_ALREADY_VERIFIED` | 409 | Cannot replace a verified course form |
| `FILE_TOO_LARGE` | 413 | Upload exceeds 5MB |
| `INVALID_FILE_TYPE` | 400 | Only PDF/JPG/PNG allowed |
| `SCHOOL_FEES_ALREADY_PAID` | 409 | School fees already paid for this session |

---

## Testing

- **AuthService.getMe** — returns user for valid JWT sub
- **RegistrationService** — submit (happy path, duplicate, verified block), admin review (verify, reject with note)
- **NotificationsService** — list (filtered by dept/level), mark read, unread count
- **PaymentsService.initiateSchoolFees** — creates pending payment, calls Paystack, blocks duplicate

---

## Mockup Reference

Visual mockups saved in `.superpowers/brainstorm/253-1779979438/content/`:
- `dashboard-shell.html` — shell layout options
- `dashboard-home-content.html` — home content options  
- `transcript-style.html` — transcript display options
- `full-dashboard-mockup.html` — **approved full-fidelity dashboard mockup**
- `revised-nav.html` — final navigation with all sections
