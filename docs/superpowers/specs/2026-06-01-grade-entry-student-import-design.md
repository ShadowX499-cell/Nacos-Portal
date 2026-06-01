# Grade Entry — Student Import by Program & Level

**Date:** 2026-06-01  
**Status:** Approved

## Problem

`GradeEntryPage` (`/admin/gradebooks/:id/courses/:courseId/grades`) shows "No students found" when no `student_grades` records exist for a course yet. Admins are forced to upload a CSV just to seed the table — there is no way to import enrolled students for manual score entry.

## Solution

When the grade table is empty, replace the static empty state with an **Import Students** panel. The admin selects Program and Level, clicks "Load Students", and the table pre-populates with matching enrolled students (empty scores). The admin then fills in CA and Exam scores and saves using the existing endpoint.

## Backend

### New endpoint

```
GET /api/v1/gradebooks/:id/courses/:courseId/eligible-students
Query params: program (CSC | ICT | CRE), level (L100 | L200 | L300 | L400)
Auth: admin / super_admin
```

**Behaviour:**
- Validates gradebook and course belong to actor's department
- Fetches users where:
  - `departmentId` = actor's department
  - `program` = query param (required)
  - `level` = query param (defaults to gradebook's own level if omitted)
  - `role` = `student`
  - `status` = `validated`
- Excludes students who already have a `student_grades` row for this `courseId`
- Returns `[{ id, userId, name }]` ordered by name

### Files changed
- `backend/src/modules/gradebooks/gradebook.service.ts` — add `getEligibleStudents()`
- `backend/src/modules/gradebooks/gradebook.controller.ts` — add handler
- `backend/src/modules/gradebooks/gradebook.routes.ts` — add route
- `frontend/src/api/client.ts` — add `gradebookApi.getEligibleStudents()`

No schema changes. No new migrations.

## Frontend

### GradeEntryPage — empty state replaced

**When `rows.length === 0` AND no import has been attempted:**

Show an Import Students panel:
- **Program** dropdown: CSC / ICT / CRE
- **Level** dropdown: 100 / 200 / 300 / 400 — pre-filled from `gradebook.level`
- **Load Students** button (disabled until program is selected)
- On click: calls `getEligibleStudents`, maps results to `GradeRow[]` with empty `caScore`/`examScore`, sets `rows`

**After import (rows populated, but all scores empty):**
- The normal grade table renders
- Admin fills in CA and Exam scores
- Existing **Save All Grades** button and `upsertGrades` endpoint used unchanged
- An "Import different students" link allows re-triggering the panel

**When `rows.length === 0` AND import returned no results:**
- Show: "No students found for [Program] [Level]. Check that students are enrolled and activated."

### Files changed
- `frontend/src/pages/admin/GradeEntryPage.tsx` — replace empty state with import panel

## What is NOT changing
- `GradebookDetailPage` — untouched (CSV tab remains there)
- `GradebookListPage`, `CreateGradebookPage` — untouched
- Save / upsert logic — no changes
- Database schema — no migrations

## Scope boundary
This feature only adds the student-import shortcut. It does not change the CSV upload flow, publish flow, or any other gradebook behaviour.
