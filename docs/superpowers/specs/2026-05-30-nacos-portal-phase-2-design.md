# NACOS Portal — Phase 2 Feature Design Spec
**Date:** 2026-05-30  
**Status:** Approved  
**Sub-projects:** E (Profile & Registration) → F (RBAC & Audit Logs) → D (Academic Enrollment) → G (Revenue Dashboard) + H (Student Dashboard Badges, rolled in)

---

## 1. Overview

This spec covers 8 interconnected features grouped into 4 sub-projects, to be implemented in the order E → F → D → G. Each sub-project gets its own implementation plan.

| Sub-project | Feature set | Depends on |
|-------------|-------------|------------|
| E | Student profile & registration enhancements, random 5-digit ID | — |
| F | 3 super admin roles, permission middleware, audit log viewer | E (profile photo) |
| D | Student by Program view, carryover logic, semester/session transitions | F (role gates) |
| G | Revenue dashboard with filters + CSV export | F (HOD-only gate) |
| H | Student dashboard X/8 payment badges | E (compliance endpoint) |

---

## 2. Sub-project E — Student Profile & Registration

### 2.1 Goals
- Admin can upload a passport photo when creating a student
- Admin captures: State of Origin, LGA, Date of Birth, Home Address
- Student can update their own photo and bio fields on the Profile page
- Student IDs use a random 5-digit suffix (not sequential)

### 2.2 Schema changes (`User` model — additive)
```prisma
profilePhotoUrl  String?   @map("profile_photo_url") @db.VarChar(500)
dateOfBirth      DateTime? @map("date_of_birth")     @db.Date
stateOfOrigin    String?   @map("state_of_origin")   @db.VarChar(50)
lga              String?                              @db.VarChar(100)
homeAddress      String?   @map("home_address")       @db.VarChar(300)
```

### 2.3 ID format change
- Current: `NACOS/[PROGRAM]/[YEAR]/[sequential 3-digit]`
- New: `NACOS/[PROGRAM]/[YEAR]/[5-digit random]` e.g. `NACOS/CSC/2024/47291`
- Generation: `crypto.randomInt(10000, 99999)`, retry up to 5× on collision
- Error code on exhaustion: `ID_GENERATION_FAILED` (practically impossible at current scale)

### 2.4 File storage
- **Local filesystem** (`backend/uploads/`) served via Express static at `/api/v1/uploads/:filename`
- Multer config: JPEG/PNG only, max 2 MB, single file per field
- Filename: UUID (not original name) to prevent path traversal
- Old file deleted when photo is replaced
- Migration path to S3: swap the multer storage engine in one service method

### 2.5 API changes
| Method | Endpoint | Change |
|--------|----------|--------|
| POST | `/api/v1/admin/users` | Becomes `multipart/form-data`; accepts `photo` file + new bio fields |
| PATCH | `/api/v1/admin/users/:id` | Accepts updated bio fields and optional new photo |
| GET | `/api/v1/profile/me` | Extended to include new bio fields + photo URL |
| GET | `/api/v1/uploads/:filename` | New — Express static for uploaded photos |

### 2.6 Frontend changes
- **CreateUserPage**: passport photo uploader (drag-and-drop + preview), DOB date picker, State dropdown (36 Nigerian states hardcoded), LGA dropdown (cascaded from state), Home Address textarea
- **AdminProfilePage / StudentProfilePage**: show passport photo, editable bio fields
- **UserListPage**: student rows show passport thumbnail (32×32, rounded)
- **StudentDashboard hero**: replace initials avatar with passport photo (fallback to initials)

### 2.7 Error codes
- `INVALID_FILE_TYPE` (400) — non-JPEG/PNG upload
- `FILE_TOO_LARGE` (400) — exceeds 2 MB
- `ID_GENERATION_FAILED` (500) — 5 collision retries exhausted

---

## 3. Sub-project F — Super Admin RBAC & Audit Logs

### 3.1 Goals
- 3 distinct super-admin roles with different permission sets
- HOD is the only account that can create other super admins
- Every sensitive action is logged with before/after diff
- HOD can view and filter all audit logs; other super admins see only their own trail

### 3.2 Schema changes (additive)

**New enum on `User`:**
```prisma
enum SuperAdminType {
  course_adviser
  hod
  result_exam_officer
}

// On User model:
superAdminType  SuperAdminType?  @map("super_admin_type")
```

**Existing `UserRole` enum unchanged** (`student | admin | super_admin`). A super admin has `role = super_admin` AND a non-null `superAdminType`.

### 3.3 Permission matrix

| Permission | Regular Admin | Course Adviser | Result/Exam Officer | HOD |
|------------|:---:|:---:|:---:|:---:|
| Create/manage students | ✅ | ✅ | ✅ | ✅ |
| Validate student accounts | ✅ | ✅ | ✅ | ✅ |
| Create/manage gradebooks | ✅ | ✅ | ✅ | ✅ |
| Enter/edit grades | ✅ | ✅ | ✅ | ✅ |
| Manage notifications | ✅ | ✅ | ❌ | ✅ |
| **Publish results** | ❌ | ❌ | ✅ | ✅ |
| **Approve course registrations** | ❌ | ✅ | ❌ | ✅ |
| **Manage elections** | ❌ | ❌ | ❌ | ✅ |
| **Exam attendance** | ✅ | ❌ | ✅ | ✅ |
| **Advance semester/session** | ❌ | ❌ | ❌ | ✅ |
| **View revenue/payments** | ❌ | ❌ | ❌ | ✅ |
| **Create other admins** | ❌ | ❌ | ❌ | ✅ |
| **View ALL audit logs** | ❌ | ❌ | ❌ | ✅ |
| View own audit trail | ❌ | ✅ | ✅ | ✅ |

### 3.4 Permission middleware
```typescript
// src/middleware/permission.ts
requirePermission(permission: PermissionKey): RequestHandler
```
- Reads `req.user.role` + `req.user.superAdminType`
- Checks against static `PERMISSION_MAP` object
- `403 FORBIDDEN_ROLE` on failure
- Logs `UNAUTHORIZED_ACCESS_ATTEMPT` to audit_logs on every failure

### 3.5 API — new endpoints
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/v1/admin/super-admins` | HOD only |
| GET | `/api/v1/admin/super-admins` | HOD only |
| DELETE | `/api/v1/admin/super-admins/:id` | HOD only |
| GET | `/api/v1/admin/audit-logs` | HOD only (filters: actorId, role, action, entity, dateFrom, dateTo) |
| GET | `/api/v1/admin/audit-logs/me` | Any super admin |
| GET | `/api/v1/admin/audit-logs/:id` | HOD only (full before/after diff) |

### 3.6 Audit events logged
| Action constant | Trigger | Captured data |
|-----------------|---------|---------------|
| `STUDENT_CREATED` | Admin creates student | actorId, studentId, program, level |
| `STUDENT_VALIDATED` | Admin activates account | actorId, studentId, old→new status |
| `STUDENT_SUSPENDED` | Admin suspends | actorId, studentId, reason |
| `GRADE_ENTERED` | Grade saved | actorId, courseId, studentId, old→new score |
| `RESULT_PUBLISHED` | Gradebook published | actorId, gradebookId, carryovers_flagged |
| `SESSION_ADVANCED` | HOD advances calendar | actorId, from→to, students_promoted, graduates |
| `SUPER_ADMIN_CREATED` | HOD assigns super role | actorId (HOD), targetId, role |
| `SUPER_ADMIN_REVOKED` | HOD removes super role | actorId (HOD), targetId, role |
| `ELECTION_CREATED` | Election created | actorId, electionId, title |
| `PAYMENT_VERIFIED` | Payment confirmed | actorId, paymentId, studentId, type, amount |
| `UNAUTHORIZED_ATTEMPT` | Permission check fails | actorId, attempted_action, actor_role |

### 3.7 Frontend — new pages
- **`/admin/super-admins`** (HOD only): list super admins with role badges, "Add Super Admin" modal (pick existing admin + assign role), revoke button with confirmation
- **`/admin/audit-logs`** (HOD only): timeline table, filter bar, click row → before/after JSON diff, CSV export
- **Admin sidebar**: 4 new HOD-only items (Academic Calendar, Revenue, Audit Logs, Super Admins)
- Role-gated sidebar: items hidden/disabled based on `superAdminType`

---

## 4. Sub-project D — Academic Enrollment

### 4.1 Goals
- "Students by Program" donut chart on admin dashboard (alongside existing "by Level")
- Program filter tab on UserListPage (All · ICT · CSC · CRE)
- Carryover student logic: failed courses tagged at publish time, student status updated
- HOD can advance semester or session; all active students auto-promoted on session change
- Carryover courses displayed on student's Results page

### 4.2 Schema changes (additive)

**On `User` model:**
```prisma
enum StudentStatus {
  active
  carryover
  graduated
  suspended  // note: separate from UserStatus.suspended
}

studentStatus  StudentStatus  @default(active) @map("student_status")
```

**On `StudentGrade` model:**
```prisma
isCarryover         Boolean    @default(false) @map("is_carryover")
carriedFromSession  String?    @map("carried_from_session") @db.VarChar(20)
resolvedAt          DateTime?  @map("resolved_at")
```

**New `AcademicTransition` model:**
```prisma
model AcademicTransition {
  id                String   @id @default(uuid())
  departmentId      String   @map("department_id")
  fromSession       String   @map("from_session")   @db.VarChar(20)
  fromSemester      Semester @map("from_semester")
  toSession         String   @map("to_session")     @db.VarChar(20)
  toSemester        Semester @map("to_semester")
  studentsAdvanced  Int      @map("students_advanced")
  studentsGraduated Int      @map("students_graduated")
  initiatedById     String   @map("initiated_by")
  initiatedAt       DateTime @default(now()) @map("initiated_at")

  department  Department @relation(fields: [departmentId], references: [id])
  initiatedBy User       @relation(fields: [initiatedById], references: [id])

  @@map("academic_transitions")
}
```

### 4.3 Carryover logic (triggered on gradebook publish)
1. For every `StudentGrade` in the gradebook where `grade = 'F'`:
   - Set `isCarryover = true`
   - Set `carriedFromSession = gradebook.session`
2. Update `studentStatus = 'carryover'` for any student with at least one unresolved carry-over
3. When a later gradebook is published and a student passes (`grade ≠ 'F'`) a previously failed course:
   - Stamp `resolvedAt` on the old `StudentGrade` row
   - Recompute `studentStatus` — if zero unresolved carry-overs remain → `active`

### 4.4 Semester/session advance logic
**Semester advance** (first → second, same session year):
- Update `department.currentSemester`
- No student level changes
- Log `SESSION_ADVANCED` audit event

**Session advance** (second → first of new year):
- Update `department.currentSession` and `currentSemester`
- For all students with `studentStatus ∈ {active, carryover}`:
  - L100 → L200, L200 → L300, L300 → L400
  - L400 → `studentStatus = graduated` (no further level change)
- Suspended students: level unchanged, status unchanged
- Log `SESSION_ADVANCED` audit event with counts

**Pre-advance validation:**
- If draft gradebooks exist for current semester → warning (not a block)
- HOD must pass `{ confirm: true, force: true }` if they want to override the warning
- Double-advance guard: check if `AcademicTransition` already exists for target session/semester → `409 ALREADY_ADVANCED`

### 4.5 API changes
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v1/admin/dashboard` | Adds `studentsByProgram[]` to response |
| GET | `/api/v1/admin/users` | New `?program=` filter param |
| GET | `/api/v1/admin/academic/preview` | Dry-run: returns counts before advancing |
| POST | `/api/v1/admin/academic/advance` | HOD only; body: `{ type, confirm, force? }` |
| GET | `/api/v1/admin/academic/transitions` | History of past advances |
| GET | `/api/v1/student/carryovers` | Student's unresolved carry-over courses |

### 4.6 Frontend changes
- **AdminDashboard**: add "Students by Program" donut (ICT/CSC/CRE colours). Total Revenue KPI card becomes a `<Link>` to `/admin/revenue`
- **UserListPage**: program tab row (All · ICT · CSC · CRE). StudentStatus badge beside student name
- **AcademicCalendarPage** (`/admin/academic`): current session/semester header, "Preview Advance" → confirmation modal (shows dry-run numbers + unpublished gradebook warning), history table
- **Student ResultsHomePage**: carryover banner listing unresolved failed courses (code, title, original session, status Pending/Resolved)

---

## 5. Sub-project G — Revenue Dashboard

### 5.1 Goals
- Clicking "Total Revenue" KPI card navigates to `/admin/revenue`
- Full-page revenue analytics with filter bar
- Breakdown by payment type, program, and level
- Monthly trend chart
- Paginated payment table
- CSV export

### 5.2 API
**`GET /api/v1/admin/revenue`** — HOD only

Query params: `dateFrom`, `dateTo`, `session`, `semester`, `program`, `level`, `type`

Response shape:
```json
{
  "totalRevenue": 1250000,
  "collectionRate": 72.4,
  "byType": [
    { "type": "nacos_dues", "amount": 450000, "count": 90 },
    { "type": "school_fees", "amount": 600000, "count": 60 },
    { "type": "result_subscription", "amount": 200000, "count": 200 }
  ],
  "byProgram": [{ "program": "CSC", "amount": 700000 }, ...],
  "byLevel":   [{ "level": "L100", "amount": 400000 }, ...],
  "monthlyTrend": [{ "month": "Jan", "total": 120000 }, ...],
  "recentPayments": [...],
  "meta": { "page": 1, "total": 350 }
}
```

**`GET /api/v1/admin/revenue/export`** — same filters, returns CSV download

### 5.3 Frontend — RevenuePage (`/admin/revenue`)
- **Filter bar**: date-range picker, session select, semester select, program multi-select, level multi-select, payment type multi-select. "Clear filters" button.
- **KPI row**: Total Revenue · NACOS Dues · School Fees · Result Subscriptions · Collection Rate %
- **Charts row**: monthly bar chart (reuses existing `RevenueBarChart` component) + breakdown donuts (by type, by program)
- **Payment table**: student name, ID, type badge, amount, status, date — sortable, paginated
- **Export button**: triggers CSV download

---

## 6. Sub-project H — Student Dashboard Payment Badges

### 6.1 Goals
- 3 new `X/8` stat cards in student dashboard hero: NACOS Due, School Fees, Course Form
- Auto-updates when payments are made or course registrations are verified

### 6.2 API — `GET /api/v1/student/compliance`
```json
{
  "nacosDue":   { "paid": 2, "total": 8 },
  "schoolFees": { "paid": 1, "total": 8 },
  "courseForm": { "verified": 1, "total": 8 }
}
```
- `nacosDue.paid` = count of `Payment` rows where `type = nacos_dues` AND `status = success` for this student
- `schoolFees.paid` = count of `Payment` rows where `type = school_fees` AND `status = success`
- `courseForm.verified` = count of `CourseRegistration` rows where `status = verified`
- `total = 8` is a constant (4 years × 2 semesters); hardcoded for now, configurable later

### 6.3 Frontend — StudentDashboard hero
- The existing 3 stat cards (Credits Earned, Semesters, Results) expand to 6
- New cards: NACOS Due (X/8), School Fees (X/8), Course Form (X/8)
- Card colour: green if X = total, amber if 0 < X < total, red if X = 0

---

## 7. Cross-cutting concerns

### 7.1 Migrations
All schema changes are purely additive. One migration per sub-project, run in implementation order:
1. `npx prisma migrate dev --name add-user-profile-fields` — Sub-project E (profilePhotoUrl, dateOfBirth, stateOfOrigin, lga, homeAddress)
2. `npx prisma migrate dev --name add-super-admin-type` — Sub-project F (SuperAdminType enum + column on User)
3. `npx prisma migrate dev --name add-academic-enrollment` — Sub-project D (StudentStatus enum + column, isCarryover + carriedFromSession + resolvedAt on StudentGrade, AcademicTransition model)

No existing data is broken. Existing `super_admin` users get `superAdminType = NULL` until HOD assigns a role.

### 7.2 Existing admin/super_admin handling
- Existing rows with `role = super_admin` and `superAdminType = NULL` are treated as **regular admins** by the permission middleware (safe fallback)
- HOD must explicitly assign a `superAdminType` to elevate them
- The first HOD account is bootstrapped via `backend/prisma/seed-hod.ts` — a one-time script that sets `role = super_admin, superAdminType = hod` on a designated admin user by email. Run once after migration 2: `npx ts-node prisma/seed-hod.ts --email hod@dept.edu`

### 7.3 Nigerian states & LGAs
- All 36 states + FCT hardcoded in a frontend constant file `src/constants/nigeria-geo.ts`
- 774 LGAs grouped by state — LGA dropdown filters reactively when state changes
- No external API dependency

### 7.4 Rate limiting
- `/api/v1/admin/academic/advance` — 3 req / 60 min (prevents accidental rapid firing)
- `/api/v1/uploads/*` — 100 req / min per IP
- `/api/v1/admin/revenue/export` — 10 req / 10 min (CSV generation is expensive)

---

## 8. Implementation order within each sub-project

For each sub-project, follow: **schema migration → backend service → controller/routes → frontend**.

| Sub-project | Estimated complexity |
|-------------|---------------------|
| E | Medium (file upload + new form fields) |
| F | High (RBAC middleware + audit log viewer) |
| D | High (carryover logic + session advance + calendar UI) |
| G | Medium (filtered queries + charts) |
| H | Low (new endpoint + 3 stat cards) |
