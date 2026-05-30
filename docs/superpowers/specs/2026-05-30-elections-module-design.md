# Elections Module — Design Spec
**Date:** 2026-05-30  
**Status:** Approved  
**Sub-project:** B of A→B→C (Admin Dashboard → Elections → Biometric Attendance)

---

## 1. Goal

Build a complete end-to-end departmental elections system: admin creates elections with time-based auto-transitions + manual overrides; students self-nominate as candidates; admin approves/rejects; eligible students vote once per position; results published by admin.

---

## 2. Scope

### In scope
- Backend: elections service, controller, routes (elections + candidates + voting)
- Admin frontend: election list, create, detail (overview/candidates/results tabs)
- Student frontend: ElectionsPage rewrite — state-aware across all 5 election states
- Frontend types + API client additions
- Auto-transition logic (lazy evaluation on every request, no cron job)
- NACOS dues gate for voting and nomination

### Out of scope
- Real-time vote tally updates (Phase 3 Socket.io — future)
- Photo upload for candidates (URL string only — S3 is Phase 2+)
- Email notifications on approval/rejection (Phase 3 notifications)
- Multiple simultaneous elections

---

## 3. State Machine

```
draft ──(startTime reached OR admin override)──► active
active ──(endTime reached OR admin override)──► closed
closed ──(admin publishes)──► results_published
```

**Auto-transition rule** (`resolveElectionStatus`):
- Called at the start of every election service method
- If `status === 'draft'` and `now >= startTime`: update to `active`
- If `status === 'active'` and `now >= endTime`: update to `closed`
- Returns updated election record
- Does NOT auto-publish — admin must explicitly publish results

---

## 4. Backend

### 4.1 File structure

| File | Action |
|---|---|
| `backend/src/modules/elections/elections.service.ts` | **Create** |
| `backend/src/modules/elections/elections.controller.ts` | **Create** |
| `backend/src/modules/elections/elections.routes.ts` | **Create** |
| `backend/src/modules/elections/elections.validation.ts` | **Create** |
| `backend/src/app.ts` | Register `/api/v1/elections` |

### 4.2 Routes

**Election CRUD (admin only)**

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/elections` | Create election |
| `GET` | `/api/v1/elections` | List all elections for dept |
| `GET` | `/api/v1/elections/:id` | Get election detail + candidates + vote counts |
| `PATCH` | `/api/v1/elections/:id/status` | Manual override (activate/close/publish) |
| `DELETE` | `/api/v1/elections/:id` | Delete draft election |

**Candidate management**

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/elections/:id/candidates` | student | Submit nomination |
| `GET` | `/api/v1/elections/:id/candidates` | admin | List all candidates |
| `PATCH` | `/api/v1/elections/:id/candidates/:cid` | admin | Approve or reject |

**Voting**

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/elections/active` | student | Get active election for student's level |
| `POST` | `/api/v1/elections/:id/vote` | student | Cast all votes in one submission |

### 4.3 Service methods

```ts
class ElectionsService {
  // Admin
  createElection(dto, adminId, departmentId): Promise<Election>
  listElections(departmentId): Promise<Election[]>
  getElection(id, departmentId): Promise<ElectionDetail>
  updateStatus(id, departmentId, action: 'activate'|'close'|'publish'): Promise<Election>
  deleteElection(id, departmentId): Promise<void>

  // Candidates
  listCandidates(electionId, departmentId): Promise<Candidate[]>
  reviewCandidate(electionId, candidateId, adminId, approved: boolean): Promise<Candidate>

  // Student
  getActiveElection(departmentId, level, studentId): Promise<StudentElectionView>
  submitNomination(electionId, studentId, dto): Promise<Candidate>
  castVotes(electionId, studentId, votes: VoteBallot, ip: string): Promise<void>

  // Private
  private resolveStatus(election): Promise<Election>  // auto-transition
  private checkDuesPaid(studentId): Promise<boolean>
}
```

### 4.4 Key validation rules

- **Create election**: `endTime > startTime`, at least 1 position, at least 1 eligible level
- **Submit nomination**: election must be `draft`, student level in `eligibleLevels`, student has not already nominated for same position, NACOS dues paid
- **Cast votes**: election must be `active`, student level in `eligibleLevels`, student has not already voted in this election (check `votes` table), NACOS dues paid, all positions must be covered in the ballot, each `candidateId` must be approved and match the stated position
- **Approve candidate**: election must be `draft` or `active`
- **Status override**: valid transitions only (draft→active, active→closed, closed→results_published)
- **Vote uniqueness**: enforced at DB level by `@@unique([electionId, voterId, position])`

### 4.5 NACOS dues check

```ts
private async checkDuesPaid(studentId: string): Promise<boolean> {
  const year = new Date().getFullYear();
  const session = `${year - 1}/${year}`; // current academic session
  const payment = await this.db.payment.findFirst({
    where: {
      userId: studentId,
      type: 'school_fees',
      status: 'success',
      sessionYear: { in: [session, `${year}/${year + 1}`] },
    },
  });
  return payment !== null;
}
```

---

## 5. Frontend

### 5.1 Admin pages

**New files:**
- `frontend/src/pages/admin/ElectionListPage.tsx`
- `frontend/src/pages/admin/CreateElectionPage.tsx`
- `frontend/src/pages/admin/ElectionDetailPage.tsx`

**`ElectionListPage`**
- Status filter tabs: All / Draft / Active / Closed / Published
- Election cards: title, status badge, date range, candidate count, vote count
- "New Election" → `/admin/elections/new`
- Click card → `/admin/elections/:id`

**`CreateElectionPage`**
- Form fields: Title (text), Description (textarea), Positions (tag input — type position and press Enter to add), Eligible Levels (checkboxes: L100/L200/L300/L400), Start Date+Time, End Date+Time
- Submit creates election in `draft` status

**`ElectionDetailPage`** — 3 tabs:

*Overview tab:*
- Editable title/description/dates (only while draft)
- Status timeline visualiser: 4 steps with current highlighted
- Countdown: "Starts in X" or "Closes in X" or "Closed"
- Manual override button: "Activate Now" (draft), "Close Now" (active), "Publish Results" (closed)
- Stats: total nominations, approved candidates, votes cast

*Candidates tab:*
- Grouped by position
- Each candidate: student name, userId, manifesto excerpt, approval status
- "Approve" / "Reject" buttons (admin, when draft or active)
- Rejected candidates shown greyed out

*Results tab:*
- Always visible to admin, hidden to students until `results_published`
- Per position: ranked list with vote counts and percentage bars
- Winner highlighted with 🏆 crown badge
- Ties shown explicitly

### 5.2 Admin routing (App.tsx additions)

```tsx
<Route path="/admin/elections"          element={<ElectionListPage />} />
<Route path="/admin/elections/new"      element={<CreateElectionPage />} />
<Route path="/admin/elections/:id"      element={<ElectionDetailPage />} />
```

Remove the `phase: 'Phase 3'` badge from the Elections nav item in `AdminLayout.tsx`.

### 5.3 Student ElectionsPage (full rewrite)

**State: No election for student's level**
```
🗳️ No elections running
"There are no departmental elections open for your level."
```

**State: `draft` — nominations open**
```
Banner: "Nominations open · Election starts [date]"
Positions list with candidate counts
[Nominate Yourself] per position (if eligible + dues paid)
  → Nomination form: position (pre-filled), manifesto (required), photo URL (optional)
My Nominations section: shows pending/approved/rejected status
```

**State: `active` — voting open**
```
Countdown timer: "Voting closes in X hours Y mins"
Per position: candidate cards (photo, name, manifesto)
[Cast Your Vote] → opens modal
  Modal: radio buttons one per position, [Submit Votes] button
After voting: read-only "✅ You voted" confirmation per position
```

**State: `closed`**
```
⏳ "Results are being tallied. Check back soon."
```

**State: `results_published`**
```
Per position:
  🏆 Winner: [Name] — [X votes, Y%]
  Full breakdown: all candidates with vote bars
```

**Dues gate**: if student hasn't paid NACOS dues, nominate/vote buttons show a prompt:
"Pay your NACOS Due to participate → [Go to NACOS Due]"

---

## 6. Types (frontend/src/types/index.ts additions)

```ts
export type ElectionStatus = 'draft' | 'active' | 'closed' | 'results_published';

export interface Election {
  id: string;
  title: string;
  description: string | null;
  status: ElectionStatus;
  positions: string[];
  eligibleLevels: string[];
  startTime: string;
  endTime: string;
  candidateCount: number;
  approvedCandidateCount: number;
  voteCount: number;
  createdAt: string;
}

export interface ElectionCandidate {
  id: string;
  electionId: string;
  position: string;
  manifesto: string | null;
  photoUrl: string | null;
  isApproved: boolean;
  studentName: string;
  studentUserId: string;
  createdAt: string;
}

export interface CandidateResult extends ElectionCandidate {
  voteCount: number;
  percentage: number;
  isWinner: boolean;
}

export interface StudentElectionView {
  election: Election;
  candidates: ElectionCandidate[];          // approved candidates (for voting)
  myNominations: ElectionCandidate[];       // student's own nominations
  hasVoted: boolean;
  hasPaidDues: boolean;
  results: CandidateResult[] | null;        // only populated when results_published
}

export interface CreateElectionForm {
  title: string;
  description: string;
  positions: string[];
  eligibleLevels: string[];
  startTime: string;
  endTime: string;
}

export interface VoteBallot {
  votes: { position: string; candidateId: string }[];
}
```

---

## 7. API Client additions

```ts
// Admin
export const electionsAdminApi = {
  list: () => api.get<{ success: true; data: Election[] }>('/elections'),
  create: (body: CreateElectionForm) => api.post<{ success: true; data: Election }>('/elections', body),
  get: (id: string) => api.get<{ success: true; data: ElectionDetail }>(`/elections/${id}`),
  updateStatus: (id: string, action: 'activate' | 'close' | 'publish') =>
    api.patch<{ success: true; data: Election }>(`/elections/${id}/status`, { action }),
  delete: (id: string) => api.delete(`/elections/${id}`),
  listCandidates: (id: string) => api.get<{ success: true; data: ElectionCandidate[] }>(`/elections/${id}/candidates`),
  reviewCandidate: (id: string, cid: string, approved: boolean) =>
    api.patch<{ success: true; data: ElectionCandidate }>(`/elections/${id}/candidates/${cid}`, { approved }),
};

// Student
export const electionsStudentApi = {
  getActive: () => api.get<{ success: true; data: StudentElectionView | null }>('/elections/active'),
  nominate: (id: string, body: { position: string; manifesto: string; photoUrl?: string }) =>
    api.post<{ success: true; data: ElectionCandidate }>(`/elections/${id}/candidates`, body),
  vote: (id: string, body: VoteBallot) =>
    api.post<{ success: true; data: { message: string } }>(`/elections/${id}/vote`, body),
};
```

---

## 8. File Change Summary

| File | Action |
|---|---|
| `backend/src/modules/elections/elections.service.ts` | Create |
| `backend/src/modules/elections/elections.controller.ts` | Create |
| `backend/src/modules/elections/elections.routes.ts` | Create |
| `backend/src/modules/elections/elections.validation.ts` | Create |
| `backend/src/app.ts` | Add elections routes |
| `frontend/src/types/index.ts` | Add election types |
| `frontend/src/api/client.ts` | Add electionsAdminApi + electionsStudentApi |
| `frontend/src/pages/admin/ElectionListPage.tsx` | Create |
| `frontend/src/pages/admin/CreateElectionPage.tsx` | Create |
| `frontend/src/pages/admin/ElectionDetailPage.tsx` | Create |
| `frontend/src/pages/student/ElectionsPage.tsx` | Rewrite |
| `frontend/src/components/AdminLayout.tsx` | Remove Phase 3 lock from Elections nav |
| `frontend/src/App.tsx` | Add 3 admin election routes |
