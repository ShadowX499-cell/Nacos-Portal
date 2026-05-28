# Phase 2 Design: Grade & Results + Result Subscription Payment

**Date:** 2026-05-28  
**Modules:** 4 (Grade & Results) + 5 (Result Subscription Payment)  
**Status:** Approved

---

## 1. Scope

Phase 2 adds two modules on top of the Phase 1 auth + admin foundation:

- **Module 4 — Grade & Results**: Admin manages gradebooks, courses, and student grades (manual entry + CSV upload). Admin publishes a gradebook, producing an immutable ResultSnapshot. Students view their results.
- **Module 5 — Result Subscription Payment**: Students pay a per-semester fee via Paystack to unlock viewing their results for that semester.

---

## 2. Architecture

### Module structure

```
backend/src/modules/
  grades/
    grades.service.ts       ← gradebook, course, grade entry, CSV, snapshot logic
    grades.controller.ts
    grades.routes.ts
    grades.validation.ts
  payments/
    payments.service.ts     ← Paystack initiation, webhook, access gate
    payments.controller.ts
    payments.routes.ts
    payments.validation.ts

frontend/src/pages/
  admin/
    GradebooksPage.tsx
    GradebookDetailPage.tsx   ← 3-tab: Courses / Grades / Publish
  student/
    StudentDashboard.tsx
    ResultsPage.tsx
    PaymentsPage.tsx
frontend/src/api/client.ts   ← add gradesApi, studentApi, paymentsApi
```

### Data flow — publishing results

1. Admin creates Gradebook (level, semester, session).
2. Admin adds Courses to gradebook.
3. Admin enters grades per student per course (manual or CSV).
4. Admin hits Publish → service computes `total = caScore + examScore`, applies grading scale, computes per-student GPA.
5. Service writes `ResultSnapshot` (full JSON + SHA-256 checksum) and sets gradebook status to `published`.
6. Gradebook becomes read-only after publish.

### Data flow — student viewing results

1. Student requests results for a semester.
2. Backend checks `payments` table for a `success` record matching `(userId, sessionYear, semester)`.
3. If found → return data from `ResultSnapshot` (immutable, not live grades).
4. If not found → return HTTP 402 with `{ paystackUrl }` hint.

### Data flow — payment

1. Student POSTs `/api/v1/payments/initiate` with `{ sessionYear, semester }`.
2. Backend creates a pending `Payment` record (unique `reference = uuid`).
3. Backend calls Paystack `POST /transaction/initialize` with `amount`, `email`, `reference`, `callback_url`.
4. Returns Paystack `authorization_url` to frontend.
5. Frontend redirects: `window.location.href = authorizationUrl`.
6. Paystack redirects back to `/student/payments?reference=xxx`.
7. Frontend calls `GET /api/v1/payments/verify/:reference`.
8. Backend re-verifies with Paystack `GET /transaction/verify/:reference`.
9. On confirmed success → marks Payment as `success`, returns updated record.
10. Separately, Paystack also fires a webhook to `POST /api/v1/payments/webhook` — backend verifies HMAC-SHA512 signature and updates payment status (idempotent).

---

## 3. Backend API

### Grades module (admin-only, requires admin or super_admin role)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/admin/gradebooks` | Create gradebook |
| GET | `/api/v1/admin/gradebooks` | List gradebooks (filter: level, semester, status, session) |
| GET | `/api/v1/admin/gradebooks/:id` | Get gradebook with its courses |
| PATCH | `/api/v1/admin/gradebooks/:id/publish` | Publish → creates ResultSnapshot |
| POST | `/api/v1/admin/gradebooks/:id/courses` | Add course |
| DELETE | `/api/v1/admin/gradebooks/:id/courses/:courseId` | Remove course (draft only) |
| PUT | `/api/v1/admin/gradebooks/:id/courses/:courseId/grades` | Upsert grade for one student |
| GET | `/api/v1/admin/gradebooks/:id/courses/:courseId/grades` | List all grades for a course |
| POST | `/api/v1/admin/gradebooks/:id/courses/:courseId/grades/csv` | Bulk CSV upload |

### Student results (student-only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/student/me` | Profile + cumulative GPA summary |
| GET | `/api/v1/student/results` | List published gradebooks for the student's level, each with payment status |
| GET | `/api/v1/student/results/:gradebookId` | Fetch result snapshot (402 if unpaid) |

### Payments module (student-only except webhook)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/payments/initiate` | Create pending Payment + get Paystack checkout URL |
| GET | `/api/v1/payments/verify/:reference` | Manual verify after Paystack redirect |
| POST | `/api/v1/payments/webhook` | Paystack webhook (no JWT auth, HMAC-SHA512 verified) |
| GET | `/api/v1/payments/history` | Authenticated student's payment list |

---

## 4. Key Service Logic

### GradeService

- **createGradebook**: Validates department scope, checks no duplicate (departmentId, level, semester, session).
- **addCourse**: Appends to gradebook courses; only allowed when status = `draft`.
- **upsertGrade**: Computes `total = caScore + examScore`, maps to grade/gradePoint using the standard scale. Records `enteredById` and `lastModifiedById` + timestamps.
- **csvUpload**: Parses CSV (columns: `userId`, `caScore`, `examScore`). Creates a `CsvUploadJob`. Validates each row (student must exist at gradebook's level, scores 0–100). Upserts valid rows, collects errors. Updates job with `processedRows`, `errorLog`, final status. Returns summary report synchronously.
- **publishGradebook**: Fetches all grades for all courses in the gradebook. Computes per-student GPA for students who have at least one grade. Serialises to JSON, computes SHA-256 checksum, writes `ResultSnapshot`, sets gradebook status to `published`. Students with no grades appear in the snapshot with null scores. The Publish tab shows a completeness warning (e.g. "12/45 students have no grades") but does not block publication.
- **getStudentResults**: Verifies payment before returning snapshot data.

### PaymentService

- **initiatePayment**: Checks no existing success payment for same `(userId, sessionYear, semester)`. Creates `Payment` record. Calls Paystack API. Returns `{ reference, authorizationUrl }`.
- **verifyPayment**: Calls Paystack verify endpoint. On `success` status, marks Payment `success` and records `gatewayRef` + `paidAt`. Idempotent — returns current status if already processed.
- **handleWebhook**: The `/webhook` route must use `express.raw({ type: 'application/json' })` middleware (not `express.json()`) so the raw body is available for signature verification. Verifies `x-paystack-signature` header using HMAC-SHA512(`PAYSTACK_WEBHOOK_SECRET`, rawBody). On `charge.success` event, calls `verifyPayment` logic. Responds HTTP 200 immediately regardless of processing outcome (Paystack retry behaviour).

### GPA computation (at publish)

```
GPA = Σ(gradePoint × creditUnits) / Σ(creditUnits)
```

Using grading scale:
| Score | Grade | Points |
|-------|-------|--------|
| 70–100 | A | 5.0 |
| 60–69 | B | 4.0 |
| 50–59 | C | 3.0 |
| 45–49 | D | 2.0 |
| 40–44 | E | 1.0 |
| 0–39 | F | 0.0 |

---

## 5. Frontend Pages

### Admin — GradebooksPage (`/admin/gradebooks`)
- Table: name, level, semester, session, status badge, course count, action links.
- Filter bar: level, semester, status dropdowns.
- "New Gradebook" button → `/admin/gradebooks/new`.

### Admin — GradebookDetailPage (`/admin/gradebooks/:id`)
Three tabs:

**Courses tab**: Course list (code, title, credit units, student count). "Add Course" inline form. Delete button (draft only).

**Grades tab**: Course selector dropdown → spreadsheet table of all students at that level (userId, name, CA, Exam, Total, Grade). Inline editable CA/Exam inputs, Save button per row. CSV upload button → file picker → upload → result report modal (X rows processed, Y errors with row details).

**Publish tab**: Completeness summary (students with full grades / total students). "Publish Gradebook" button with confirmation dialog. Disabled if gradebook already published.

### Student — StudentDashboard (`/student/dashboard`)
- Four summary cards: Cumulative GPA, Latest Semester GPA, Total Credit Units Passed, Semesters Paid.
- "Latest Results" table for most recent paid semester (course code, title, CA, Exam, Total, Grade, Points).
- "Pay for Current Semester" CTA if current semester is unpaid.

### Student — ResultsPage (`/student/results`)
- Accordion list of available semesters (session + semester label).
- Each row shows payment status badge.
- Unpaid: "Pay ₦X,XXX" button → initiates payment flow.
- Paid: expand to show grades table (code, title, CA, Exam, Total, Grade, Points) + semester GPA.

### Student — PaymentsPage (`/student/payments`)
- Payment history table: date, semester, session, amount, status badge.
- "Pay for [current semester]" button at top.
- On return from Paystack (URL has `?reference=xxx`): auto-calls verify, shows success/failure toast.

---

## 6. CSV Format

```
userId,caScore,examScore
NACOS/CSC/2024/001,35.5,42.0
NACOS/CSC/2024/002,28,30
```

Validation rules:
- `userId` must exist and match the gradebook's level.
- `caScore` and `examScore`: decimal, 0–100.
- Duplicate rows for same userId within the file: last row wins.
- Rows with errors are skipped and reported; valid rows are always committed.

---

## 7. Environment Variables (additions)

```env
# backend/.env
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_WEBHOOK_SECRET=whsec_...
RESULT_SUBSCRIPTION_AMOUNT=50000   # in kobo (Paystack unit): 50000 = ₦500
```

---

## 8. Error Codes (additions)

| Code | HTTP | Meaning |
|------|------|---------|
| `GRADEBOOK_NOT_FOUND` | 404 | Gradebook doesn't exist or not in department |
| `GRADEBOOK_ALREADY_PUBLISHED` | 409 | Attempt to modify a published gradebook |
| `GRADEBOOK_INCOMPLETE` | 422 | Publish attempted with missing grades |
| `COURSE_NOT_FOUND` | 404 | Course not in gradebook |
| `GRADE_INVALID_SCORE` | 422 | Score outside 0–100 |
| `PAYMENT_ALREADY_EXISTS` | 409 | Student already has success payment for this semester |
| `PAYMENT_NOT_FOUND` | 404 | Reference not found |
| `PAYMENT_REQUIRED` | 402 | Student hasn't paid for this semester |
| `PAYMENT_WEBHOOK_INVALID` | 400 | HMAC signature mismatch |

---

## 9. Testing

- **GradeService**: unit tests (mocked Prisma) covering upsertGrade, publishGradebook (GPA computation), csvUpload (valid rows, error rows, duplicate handling).
- **PaymentService**: unit tests covering initiatePayment (duplicate guard), verifyPayment (idempotency), handleWebhook (valid/invalid signature).
- Follow the same Vitest pattern as Phase 1 tests in `backend/tests/`.
