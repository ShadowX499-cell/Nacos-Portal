# Grade Entry — Student Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the grade entry table is empty, show a Program + Level selector that fetches enrolled students and pre-populates the table for manual score entry.

**Architecture:** Add one backend endpoint (`GET /gradebooks/:id/courses/:courseId/eligible-students?program=CSC&level=L100`) that returns active students not yet graded for that course. On the frontend, replace the "No students found" empty state in `GradeEntryPage` with an import panel; once students are loaded the existing save flow runs unchanged.

**Tech Stack:** Node.js + Express + Prisma (backend); React 18 + TypeScript + Axios (frontend); Jest + ts-jest (backend tests)

---

## File Map

| File | Change |
|------|--------|
| `backend/src/modules/gradebooks/gradebook.service.ts` | Add `getEligibleStudents()` method |
| `backend/src/modules/gradebooks/gradebook.validation.ts` | Add `eligibleStudentsRules` query validation |
| `backend/src/modules/gradebooks/gradebook.controller.ts` | Add `getEligibleStudents` handler |
| `backend/src/modules/gradebooks/gradebook.routes.ts` | Register the new GET route |
| `backend/tests/gradebook.service.test.ts` | Add tests for `getEligibleStudents` |
| `frontend/src/api/client.ts` | Add `gradebookApi.getEligibleStudents()` |
| `frontend/src/pages/admin/GradeEntryPage.tsx` | Replace empty state with import panel |

---

## Task 1: Backend service — `getEligibleStudents`

**Files:**
- Modify: `backend/src/modules/gradebooks/gradebook.service.ts`

- [ ] **Step 1.1 — Write the failing test**

Open `backend/tests/gradebook.service.test.ts`. Add this test block after the existing describe blocks (or create the file if it doesn't exist yet — check with `ls backend/tests/`):

```typescript
describe('GradebookService.getEligibleStudents', () => {
  const mockDb = {
    gradebook: { findFirst: jest.fn() },
    course: { findFirst: jest.fn() },
    user: { findMany: jest.fn() },
    studentGrade: { findMany: jest.fn() },
  } as unknown as PrismaClient;

  const svc = new GradebookService(mockDb);

  beforeEach(() => jest.clearAllMocks());

  it('returns students matching program+level not yet graded', async () => {
    (mockDb.gradebook.findFirst as jest.Mock).mockResolvedValue({
      id: 'gb-1', level: 'L100', departmentId: 'dept-1',
    });
    (mockDb.course.findFirst as jest.Mock).mockResolvedValue({ id: 'c-1', gradebookId: 'gb-1' });
    (mockDb.studentGrade.findMany as jest.Mock).mockResolvedValue([
      { userId: 'already-graded' },
    ]);
    (mockDb.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'u-1', userId: 'NACOS/CSC/2024/001', name: 'Alice' },
      { id: 'u-2', userId: 'NACOS/CSC/2024/002', name: 'Bob' },
    ]);

    const result = await svc.getEligibleStudents('gb-1', 'c-1', 'CSC', 'L100', 'dept-1');

    expect(mockDb.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          program: 'CSC',
          level: 'L100',
          role: 'student',
          status: 'validated',
          id: { notIn: ['already-graded'] },
        }),
      })
    );
    expect(result).toEqual([
      { id: 'u-1', userId: 'NACOS/CSC/2024/001', name: 'Alice' },
      { id: 'u-2', userId: 'NACOS/CSC/2024/002', name: 'Bob' },
    ]);
  });

  it('throws 404 when gradebook not found', async () => {
    (mockDb.gradebook.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(svc.getEligibleStudents('bad', 'c-1', 'CSC', 'L100', 'dept-1'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 404 when course not found', async () => {
    (mockDb.gradebook.findFirst as jest.Mock).mockResolvedValue({ id: 'gb-1', level: 'L100', departmentId: 'dept-1' });
    (mockDb.course.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(svc.getEligibleStudents('gb-1', 'bad', 'CSC', 'L100', 'dept-1'))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});
```

- [ ] **Step 1.2 — Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern="gradebook.service" --no-coverage 2>&1 | tail -20
```

Expected: `getEligibleStudents is not a function` or similar.

- [ ] **Step 1.3 — Implement `getEligibleStudents` in the service**

In `backend/src/modules/gradebooks/gradebook.service.ts`, add this method inside `GradebookService`, after the `getGrades` method (around line 180):

```typescript
async getEligibleStudents(
  gradebookId: string,
  courseId: string,
  program: string,
  level: string,
  departmentId: string
): Promise<{ id: string; userId: string; name: string }[]> {
  const gradebook = await this.db.gradebook.findFirst({ where: { id: gradebookId, departmentId } });
  if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Gradebook not found');

  const course = await this.db.course.findFirst({ where: { id: courseId, gradebookId } });
  if (!course) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Course not found');

  const alreadyGraded = await this.db.studentGrade.findMany({
    where: { courseId },
    select: { userId: true },
  });
  const excludeIds = alreadyGraded.map((g) => g.userId);

  return this.db.user.findMany({
    where: {
      departmentId,
      program: program as import('@prisma/client').Program,
      level: level as import('@prisma/client').Level,
      role: 'student',
      status: 'validated',
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    select: { id: true, userId: true, name: true },
    orderBy: { name: 'asc' },
  });
}
```

- [ ] **Step 1.4 — Run tests to verify they pass**

```bash
cd backend && npx jest --testPathPattern="gradebook.service" --no-coverage 2>&1 | tail -20
```

Expected: all 3 new tests PASS.

- [ ] **Step 1.5 — Commit**

```bash
cd backend && git add src/modules/gradebooks/gradebook.service.ts tests/gradebook.service.test.ts
git commit -m "feat(gradebook): getEligibleStudents service method"
```

---

## Task 2: Backend validation, controller, and route

**Files:**
- Modify: `backend/src/modules/gradebooks/gradebook.validation.ts`
- Modify: `backend/src/modules/gradebooks/gradebook.controller.ts`
- Modify: `backend/src/modules/gradebooks/gradebook.routes.ts`

- [ ] **Step 2.1 — Add validation rules**

In `backend/src/modules/gradebooks/gradebook.validation.ts`, add after the last export:

```typescript
export const eligibleStudentsRules = [
  query('program')
    .isIn(['CSC', 'ICT', 'CRE'])
    .withMessage('program must be one of: CSC, ICT, CRE'),
  query('level')
    .isIn(Object.values(Level))
    .withMessage(`level must be one of: ${Object.values(Level).join(', ')}`),
];
```

- [ ] **Step 2.2 — Add controller handler**

In `backend/src/modules/gradebooks/gradebook.controller.ts`, add after the `getGrades` handler:

```typescript
/** GET /api/v1/gradebooks/:id/courses/:courseId/eligible-students */
export const getEligibleStudents = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const { program, level } = req.query as { program: string; level: string };
  const students = await gradebookService.getEligibleStudents(
    req.params.id,
    req.params.courseId,
    program,
    level,
    departmentId
  );
  sendSuccess(res, students, 'Eligible students retrieved');
});
```

- [ ] **Step 2.3 — Register the route**

In `backend/src/modules/gradebooks/gradebook.routes.ts`:

Add `eligibleStudentsRules` to the import from `./gradebook.validation`:
```typescript
import {
  createGradebookRules,
  addCourseRules,
  upsertGradesRules,
  listGradebooksRules,
  gradebookIdRule,
  courseIdRule,
  eligibleStudentsRules,
} from './gradebook.validation';
```

Add `getEligibleStudents` to the import from `./gradebook.controller`:
```typescript
import {
  upload,
  createGradebook,
  listGradebooks,
  getGradebook,
  addCourse,
  removeCourse,
  getGrades,
  upsertGrades,
  uploadGradeCsv,
  listCsvJobs,
  getCsvJob,
  publishGradebook,
  getEligibleStudents,
} from './gradebook.controller';
```

Add the route **before** the `PUT /:id/courses/:courseId/grades` line:
```typescript
/** GET /api/v1/gradebooks/:id/courses/:courseId/eligible-students */
router.get(
  '/:id/courses/:courseId/eligible-students',
  validate([...gradebookIdRule, ...courseIdRule, ...eligibleStudentsRules]),
  getEligibleStudents
);
```

- [ ] **Step 2.4 — Smoke-test the endpoint**

Start the backend (`npm run dev` in `backend/`) and run:

```bash
curl -s "http://localhost:5000/api/v1/gradebooks/00000000-0000-0000-0000-000000000000/courses/00000000-0000-0000-0000-000000000000/eligible-students?program=CSC&level=L100" \
  -H "Authorization: Bearer <admin_token>" | jq .
```

Expected: `{ "success": false, "error": { "code": "RESOURCE_NOT_FOUND", ... } }` (404 — no gradebook with that UUID, which confirms the route is wired up and auth is working).

- [ ] **Step 2.5 — Commit**

```bash
git add backend/src/modules/gradebooks/gradebook.validation.ts \
        backend/src/modules/gradebooks/gradebook.controller.ts \
        backend/src/modules/gradebooks/gradebook.routes.ts
git commit -m "feat(gradebook): eligible-students endpoint"
```

---

## Task 3: Frontend API client

**Files:**
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 3.1 — Add `getEligibleStudents` to `gradebookApi`**

In `frontend/src/api/client.ts`, inside the `gradebookApi` object, add after `getGrades`:

```typescript
getEligibleStudents: (id: string, courseId: string, program: string, level: string) =>
  api.get<{ success: true; data: { id: string; userId: string; name: string }[] }>(
    `/gradebooks/${id}/courses/${courseId}/eligible-students`,
    { params: { program, level } }
  ),
```

- [ ] **Step 3.2 — Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3.3 — Commit**

```bash
git add frontend/src/api/client.ts
git commit -m "feat(frontend): gradebookApi.getEligibleStudents"
```

---

## Task 4: Frontend — GradeEntryPage import panel

**Files:**
- Modify: `frontend/src/pages/admin/GradeEntryPage.tsx`

- [ ] **Step 4.1 — Replace the empty state with an import panel**

Replace the entire contents of `frontend/src/pages/admin/GradeEntryPage.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { gradebookApi, extractApiError } from '../../api/client';
import type { Grade, Gradebook, Course } from '../../types';

const PROGRAMS = ['CSC', 'ICT', 'CRE'] as const;
const LEVELS   = ['L100', 'L200', 'L300', 'L400'] as const;

function levelLabel(l: string) {
  return l.replace('L', '') + ' Level';
}

interface GradeRow {
  userId: string;
  studentUserId: string;
  studentName: string;
  caScore: string;
  examScore: string;
}

export default function GradeEntryPage() {
  const { id, courseId } = useParams<{ id: string; courseId: string }>();
  const [gradebook, setGradebook] = useState<Gradebook | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState('');

  // Import panel state
  const [importProgram, setImportProgram] = useState('CSC');
  const [importLevel, setImportLevel] = useState('L100');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importAttempted, setImportAttempted] = useState(false);

  useEffect(() => {
    if (!id || !courseId) return;
    Promise.all([gradebookApi.get(id), gradebookApi.getGrades(id, courseId)])
      .then(([gbRes, gradesRes]) => {
        const gb = gbRes.data.data;
        setGradebook(gb);
        // Pre-fill level from gradebook
        setImportLevel(gb.level ?? 'L100');
        setCourse(gb.courses?.find((c) => c.id === courseId) ?? null);
        const existing = gradesRes.data.data;
        setRows(
          existing.map((g: Grade) => ({
            userId: g.userId,
            studentUserId: g.studentUserId,
            studentName: g.studentName,
            caScore: g.caScore !== null ? String(g.caScore) : '',
            examScore: g.examScore !== null ? String(g.examScore) : '',
          }))
        );
      })
      .catch((err) => setError(extractApiError(err)));
  }, [id, courseId]);

  const isDraft = gradebook?.status === 'draft';

  const handleImport = async () => {
    if (!id || !courseId) return;
    setImporting(true);
    setImportError('');
    setImportAttempted(true);
    try {
      const res = await gradebookApi.getEligibleStudents(id, courseId, importProgram, importLevel);
      const students = res.data.data;
      setRows(students.map((s) => ({
        userId: s.id,
        studentUserId: s.userId,
        studentName: s.name,
        caScore: '',
        examScore: '',
      })));
      if (students.length === 0) {
        setImportError(`No active students found for ${importProgram} ${levelLabel(importLevel)}.`);
      }
    } catch (err) {
      setImportError(extractApiError(err));
    } finally {
      setImporting(false);
    }
  };

  const updateRow = (index: number, field: 'caScore' | 'examScore', value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    if (!id || !courseId) return;
    setSaving(true);
    setSaveMsg('');
    setError('');
    try {
      const grades = rows.map((r) => ({
        userId: r.userId,
        caScore: r.caScore !== '' ? parseFloat(r.caScore) : null,
        examScore: r.examScore !== '' ? parseFloat(r.examScore) : null,
      }));
      await gradebookApi.upsertGrades(id, courseId, grades);
      setSaveMsg('Grades saved successfully.');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (error && !gradebook) return <div className="p-8 text-center text-red-600">{error}</div>;

  const showImportPanel = isDraft && rows.length === 0;

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to={`/admin/gradebooks/${id}`}
            className="text-xs text-gray-400 hover:text-gray-600 mb-1 inline-block"
          >
            ← Back to gradebook
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {course ? `${course.courseCode} — ${course.courseTitle}` : 'Grade Entry'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {gradebook?.name} &middot; CA max 30 &middot; Exam max 70
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm mb-4">{error}</div>
        )}
        {saveMsg && (
          <div className="bg-green-50 border border-green-200 rounded p-3 text-green-700 text-sm mb-4">{saveMsg}</div>
        )}

        {/* Import panel — only shown when table is empty and gradebook is draft */}
        {showImportPanel && (
          <div className="card p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Import Students</h3>
            <p className="text-xs text-gray-500 mb-4">
              Select a program and level to load enrolled students into the grade table.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Program</label>
                <select
                  value={importProgram}
                  onChange={(e) => setImportProgram(e.target.value)}
                  className="input w-28"
                >
                  {PROGRAMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
                <select
                  value={importLevel}
                  onChange={(e) => setImportLevel(e.target.value)}
                  className="input w-32"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{levelLabel(l)}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => void handleImport()}
                disabled={importing}
                className="btn-primary"
              >
                {importing ? 'Loading…' : 'Load Students'}
              </button>
            </div>
            {importError && (
              <p className="text-red-600 text-xs mt-3">{importError}</p>
            )}
            {importAttempted && !importError && rows.length === 0 && !importing && (
              <p className="text-gray-400 text-xs mt-3">
                No students found for {importProgram} {levelLabel(importLevel)}. Ensure students are enrolled and activated.
              </p>
            )}
          </div>
        )}

        {/* Grade table */}
        {rows.length === 0 && !showImportPanel ? (
          <div className="card p-8 text-center text-gray-400">
            No students found. Upload a CSV to add grades in bulk, or ensure students are enrolled.
          </div>
        ) : rows.length > 0 ? (
          <div className="card overflow-hidden">
            {isDraft && rows.length > 0 && (
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                <span className="text-xs text-blue-700">
                  {rows.length} student{rows.length !== 1 ? 's' : ''} loaded
                  — {importProgram} {levelLabel(importLevel)}
                </span>
                <button
                  onClick={() => { setRows([]); setImportAttempted(false); setImportError(''); }}
                  className="text-xs text-blue-500 hover:underline"
                >
                  Import different students
                </button>
              </div>
            )}
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Student ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Name</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">CA (0–30)</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Exam (0–70)</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => {
                  const ca = parseFloat(row.caScore);
                  const ex = parseFloat(row.examScore);
                  const total = !isNaN(ca) && !isNaN(ex) ? ca + ex : null;
                  return (
                    <tr key={row.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs text-gray-600">{row.studentUserId}</td>
                      <td className="px-4 py-2 text-gray-800">{row.studentName}</td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number" min={0} max={30} step={0.5}
                          value={row.caScore}
                          onChange={(e) => updateRow(i, 'caScore', e.target.value)}
                          disabled={!isDraft}
                          className="input w-20 text-center text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number" min={0} max={70} step={0.5}
                          value={row.examScore}
                          onChange={(e) => updateRow(i, 'examScore', e.target.value)}
                          disabled={!isDraft}
                          className="input w-20 text-center text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-center font-semibold text-gray-800">
                        {total !== null ? total.toFixed(1) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {isDraft && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button onClick={() => void handleSave()} disabled={saving} className="btn-primary">
                  {saving ? 'Saving…' : 'Save All Grades'}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 4.2 — Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4.3 — Manual test in the browser**

1. Start backend and frontend (`npm run dev` in each)
2. Log in as admin
3. Go to Gradebooks → open a draft gradebook → click "Enter grades" on any course that has no grades yet
4. Verify the **Import Students** panel appears (Program/Level dropdowns + Load Students button)
5. Select a program and level that has validated students → click **Load Students**
6. Verify the table populates with student IDs and names, all score fields empty
7. Enter a CA and Exam score for one student → verify Total computes live
8. Click **Save All Grades** → verify success message
9. Reload the page → verify saved scores persist
10. Click **Import different students** → verify the table clears and the import panel re-appears

- [ ] **Step 4.4 — Commit**

```bash
git add frontend/src/pages/admin/GradeEntryPage.tsx
git commit -m "feat(frontend): student import panel on grade entry page"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** New endpoint ✓ · Program+Level selectors ✓ · Auto-import students ✓ · Manual score entry ✓ · "Import different students" reset link ✓ · No change to CSV flow ✓ · No schema migration ✓
- [x] **No placeholders:** All steps have complete code
- [x] **Type consistency:** `getEligibleStudents` returns `{ id, userId, name }[]` in service → controller sends same shape → client types it as `{ id: string; userId: string; name: string }[]` → frontend maps `id` → `userId` (internal UUID) and `userId` → `studentUserId` (display ID), matching existing `GradeRow` interface
