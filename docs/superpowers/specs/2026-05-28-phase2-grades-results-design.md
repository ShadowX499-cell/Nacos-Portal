# Phase 2: Grades & Results + Result Subscription Payment

**Date:** 2026-05-28  
**Status:** Approved  
**Modules:** 4 (Grade & Results), 5 (Result Subscription Payment)

---

## Overview

Phase 2 adds two capabilities to NACOS-AIFUE:

1. **Grades & Results** — Admins manage gradebooks, enter grades manually or via CSV, and publish results. Students view their results with GPA/CGPA after paying.
2. **Result Subscription Payment** — Students pay per semester via Paystack to unlock their result view.

All database models (`Gradebook`, `Course`, `StudentGrade`, `ResultSnapshot`, `Payment`, `CsvUploadJob`) already exist in the Prisma schema. No schema migrations are needed.

---

## Decisions

| Question | Decision |
|---|---|
| Grade entry method | Manual form + CSV upload |
| CSV processing | Async with `CsvUploadJob` status tracking |
| Payment gate scope | Per semester (sessionYear + semester) |
| GPA display | Semester GPA (SGPA) + Cumulative GPA (CGPA) |
| Module structure | Split: `gradebooks` (admin) + `results` (student) + `payments` |
| Admin gradebook UI | Tabbed detail page (Courses & Grades / CSV Upload / Publish) |
| Student result UI | Summary stat cards (SGPA/CGPA/Credits) + grade table below |

---

## Backend Architecture

### Module structure

```
backend/src/modules/
├── gradebooks/
│   ├── gradebook.controller.ts
│   ├── gradebook.service.ts
│   ├── gradebook.routes.ts
│   └── gradebook.validation.ts
├── results/
│   ├── results.controller.ts
│   ├── results.service.ts
│   ├── results.routes.ts
│   └── results.validation.ts
└── payments/
    ├── payments.controller.ts
    ├── payments.service.ts
    ├── payments.routes.ts
    └── payments.validation.ts
```

All three modules registered in `backend/src/app.ts` alongside existing auth/admin routes.

All admin endpoints scope queries to `req.user.departmentId` (same pattern as the existing `admin` module — admins only manage their own department's data).

---

## API Endpoints

### Gradebooks (admin only — `requireAdmin`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/gradebooks` | Create gradebook |
| `GET` | `/api/v1/gradebooks` | List gradebooks (filter: level, session, semester, status) |
| `GET` | `/api/v1/gradebooks/:id` | Get gradebook with courses |
| `POST` | `/api/v1/gradebooks/:id/courses` | Add course to gradebook |
| `DELETE` | `/api/v1/gradebooks/:id/courses/:courseId` | Remove course (only if no grades exist) |
| `GET` | `/api/v1/gradebooks/:id/courses/:courseId/grades` | List grades for a course |
| `PUT` | `/api/v1/gradebooks/:id/courses/:courseId/grades` | Bulk upsert grades (manual entry) |
| `POST` | `/api/v1/gradebooks/:id/courses/:courseId/csv` | Upload CSV → creates async job |
| `GET` | `/api/v1/gradebooks/:id/csv-jobs` | List CSV jobs for gradebook |
| `GET` | `/api/v1/gradebooks/:id/csv-jobs/:jobId` | Poll job status |
| `POST` | `/api/v1/gradebooks/:id/publish` | Publish → creates `ResultSnapshot` |

### Results (student only — `requireStudent`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/results` | List published gradebooks for student's level/dept + `hasPaid` flag |
| `GET` | `/api/v1/results/:gradebookId` | View result (payment-gated, returns snapshot) |
| `GET` | `/api/v1/results/gpa` | SGPA per semester + overall CGPA |

### Payments (student only — `requireStudent`, except webhook)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/payments/initiate` | Start Paystack transaction → returns `authorization_url` |
| `GET` | `/api/v1/payments/verify/:reference` | Verify payment after Paystack redirect |
| `POST` | `/api/v1/payments/webhook` | Paystack webhook (no auth, HMAC verified) |
| `GET` | `/api/v1/payments` | Student's payment history |

---

## Business Rules

### Gradebook lifecycle
- A gradebook starts as `draft`. It can only be published when **every course has at least one grade entered**.
- Publishing sets `status: published`, records `publishedAt` + `publishedById`, and creates an immutable `ResultSnapshot` (JSON blob + SHA-256 checksum of the snapshot).
- Deleting a course is only allowed while the gradebook is `draft` and the course has no grades.
- The `locked` status (in the schema) is reserved for a future phase; Phase 2 only implements `draft → published`.

### Grading scale (from CLAUDE.md)
| Score | Grade | Points |
|---|---|---|
| 70–100 | A | 5.0 |
| 60–69 | B | 4.0 |
| 50–59 | C | 3.0 |
| 45–49 | D | 2.0 |
| 40–44 | E | 1.0 |
| 0–39 | F | 0.0 |

`total = caScore + examScore`. Grade and gradePoint are computed at the service layer on every upsert.

### GPA calculation
- **SGPA** = `Σ(gradePoint × creditUnits) / Σ(creditUnits)` for one gradebook's courses.
- **CGPA** = `Σ(gradePoint × creditUnits) / Σ(creditUnits)` across all published gradebooks the student has paid for.
- Computed at query time in `ResultsService`; never stored.

### Payment gate
- A student may view `GET /results/:gradebookId` only if a `Payment` record exists with:
  - `userId` = authenticated student
  - `type = result_subscription`
  - `status = success`
  - `sessionYear` and `semester` matching the gradebook
- If no such payment exists, the endpoint returns `402 PAYMENT_REQUIRED` with error code `PAYMENT_REQUIRED`.
- Students see the `ResultSnapshot` JSON (immutable), not live `StudentGrade` rows.

---

## CSV Upload Flow

**Expected CSV format:**
```
student_id,ca_score,exam_score
NACOS/CSC/2024/001,28,48
NACOS/CSC/2024/002,22,42
```

**Processing steps (async, in-process via `setImmediate`):**

1. `POST /gradebooks/:id/courses/:courseId/csv`  
   → Multer saves file to a temp path  
   → Creates `CsvUploadJob { status: pending, totalRows: null }`  
   → Returns `{ jobId }` with `202 Accepted`

2. `setImmediate` fires the processor:
   - Validates CSV headers (`student_id`, `ca_score`, `exam_score` required)
   - Updates job: `status = processing`, `totalRows = N`
   - For each row:
     - Looks up student by `userId` within the gradebook's department
     - Validates `caScore` (0–30) and `examScore` (0–70) — standard Nigerian university CA/exam split; hardcoded for Phase 2
     - Upserts `StudentGrade` (computes total, grade, gradePoint)
     - Increments `processedRows`
     - Collects per-row errors: `{ row, field, message }`
   - On completion: `status = completed`, `errorLog = [...]`
   - On unrecoverable error: `status = failed`

3. Admin polls `GET /gradebooks/:id/csv-jobs/:jobId` until `status = completed | failed`.

**Rows with errors are skipped** (partial import); the errorLog tells the admin which rows failed and why.

---

## Payment Flow

```
Student initiates payment:
  POST /payments/initiate { gradebookId }
  → Server creates Payment { status: pending, reference: nanoid, sessionYear, semester }
  → Calls Paystack /transaction/initialize
  → Returns { authorization_url, reference }
  → Frontend redirects to Paystack hosted page

Payment completes via webhook (primary):
  Paystack POSTs to POST /payments/webhook
  → Server verifies HMAC-SHA512 (x-paystack-signature header)
  → On event=charge.success: updates Payment { status: success, gatewayRef, paidAt }
  → Returns 200 OK

Payment completes via redirect (UX fallback):
  Paystack redirects browser to /student/results/verify?reference=xxx
  → Frontend calls GET /payments/verify/:reference
  → Server calls Paystack /transaction/verify/:reference
  → Updates Payment status accordingly
  → Frontend navigates to result view
```

**Paystack amount:** Configurable via `RESULT_SUBSCRIPTION_AMOUNT_KOBO` env var (default `50000` = ₦500).

---

## Frontend Pages

### Admin pages

| Route | Component | Description |
|---|---|---|
| `/admin/gradebooks` | `GradebookListPage` | Table of gradebooks with status badges; "New Gradebook" button |
| `/admin/gradebooks/new` | `CreateGradebookPage` | Form: name, level, session, semester |
| `/admin/gradebooks/:id` | `GradebookDetailPage` | Tabbed: Courses & Grades / CSV Upload / Publish |
| `/admin/gradebooks/:id/courses/:courseId/grades` | `GradeEntryPage` | Table of students with CA/Exam inputs; save all |

**GradebookDetailPage tabs:**
- **Courses & Grades** — list of courses, each with grade count badge; click course → GradeEntryPage
- **CSV Upload** — file picker, upload button, live job status (polling every 3s), error table
- **Publish** — readiness checklist (all courses have grades?), publish button, confirmation modal

### Student pages

| Route | Component | Description |
|---|---|---|
| `/student/results` | `ResultsHomePage` | List of published gradebooks with payment status; Pay button for unpaid |
| `/student/results/:gradebookId` | `ResultDetailPage` | Stat cards (SGPA/CGPA/Credits) + grade table |
| `/student/results/verify` | `PaymentVerifyPage` | Spinner while verifying Paystack redirect; navigates on success |

---

## New Environment Variables

```
# backend/.env
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
RESULT_SUBSCRIPTION_AMOUNT_KOBO=50000

# frontend/.env
VITE_PAYSTACK_PUBLIC_KEY=pk_test_...
```

---

## Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `PAYMENT_REQUIRED` | 402 | Student has not paid for this result |
| `GRADEBOOK_NOT_PUBLISHED` | 400 | Gradebook is still draft/locked |
| `GRADEBOOK_INCOMPLETE` | 400 | Publish attempted but not all courses have grades |
| `CSV_INVALID_HEADERS` | 400 | CSV file missing required columns |
| `INVALID_WEBHOOK_SIGNATURE` | 400 | Paystack webhook HMAC mismatch |

---

## Testing

- **GradebookService** — unit tests: create, publish (happy + incomplete gradebook), grade upsert with computed grade/GPA
- **ResultsService** — unit tests: payment gate (paid/unpaid), CGPA calculation across multiple semesters
- **PaymentsService** — unit tests: webhook signature verification, payment status transitions
- **CSV processor** — unit tests: valid rows, invalid scores, unknown student_id, malformed CSV
