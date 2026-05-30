# Elections Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete departmental elections system — admin creates/manages elections, students self-nominate as candidates, admin approves candidates, eligible students vote once per position, admin publishes results.

**Architecture:** Hybrid time-based + manual state machine (`draft→active→closed→results_published`). `resolveStatus()` lazily auto-transitions on every service call based on `startTime`/`endTime`. Schema gets a `positions String[]` column via migration. Backend is a self-contained module (`elections/`). Frontend has 3 admin pages + 1 student page (state-aware).

**Tech Stack:** React 18, TypeScript 5, Tailwind CSS 3, Lucide React, Motion/React (frontend); Express 4, Prisma 5, express-validator, crypto (backend)

---

## File Map

| File | Action |
|---|---|
| `backend/prisma/schema.prisma` | Add `positions String[]` to Election model |
| `backend/src/modules/elections/elections.validation.ts` | **Create** |
| `backend/src/modules/elections/elections.service.ts` | **Create** |
| `backend/src/modules/elections/elections.controller.ts` | **Create** |
| `backend/src/modules/elections/elections.routes.ts` | **Create** |
| `backend/src/app.ts` | Register `/api/v1/elections` |
| `frontend/src/types/index.ts` | Add election types |
| `frontend/src/api/client.ts` | Add `electionsAdminApi` + `electionsStudentApi` |
| `frontend/src/pages/admin/ElectionListPage.tsx` | **Create** |
| `frontend/src/pages/admin/CreateElectionPage.tsx` | **Create** |
| `frontend/src/pages/admin/ElectionDetailPage.tsx` | **Create** |
| `frontend/src/pages/student/ElectionsPage.tsx` | **Rewrite** |
| `frontend/src/components/AdminLayout.tsx` | Remove Phase 3 lock from Elections nav |
| `frontend/src/App.tsx` | Add 3 admin election routes |

---

## Task 1: Schema migration — add positions to Election

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add `positions` field to the Election model**

In `schema.prisma`, find the `model Election` block and add one line after `eligibleLevels`:

```prisma
model Election {
  id             String         @id @default(uuid())
  departmentId   String         @map("department_id")
  title          String         @db.VarChar(200)
  description    String?
  startTime      DateTime       @map("start_time")
  endTime        DateTime       @map("end_time")
  status         ElectionStatus @default(draft)
  eligibleLevels String[]       @map("eligible_levels")
  positions      String[]       @default([])
  createdById    String         @map("created_by")
  finalizedById  String?        @map("finalized_by")
  finalizedAt    DateTime?      @map("finalized_at")
  createdAt      DateTime       @default(now()) @map("created_at")

  department  Department  @relation(fields: [departmentId], references: [id])
  createdBy   User        @relation("CreatedElections", fields: [createdById], references: [id])
  finalizedBy User?       @relation("FinalizedElections", fields: [finalizedById], references: [id])
  candidates  Candidate[]
  votes       Vote[]

  @@map("elections")
}
```

- [ ] **Step 2: Run migration**

```bash
cd backend && npx prisma migrate dev --name add_election_positions
```

Expected output: `✔  Your database is now in sync with your schema.`

- [ ] **Step 3: Verify Prisma client regenerated**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

---

## Task 2: Backend validation rules

**Files:**
- Create: `backend/src/modules/elections/elections.validation.ts`

- [ ] **Step 1: Create the file**

```typescript
import { body, param } from 'express-validator';

export const createElectionRules = [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3–200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('positions').isArray({ min: 1 }).withMessage('At least one position required'),
  body('positions.*').trim().isLength({ min: 1, max: 100 }).withMessage('Each position must be 1–100 chars'),
  body('eligibleLevels').isArray({ min: 1 }).withMessage('At least one eligible level required'),
  body('eligibleLevels.*').isIn(['L100', 'L200', 'L300', 'L400']).withMessage('Level must be L100–L400'),
  body('startTime').isISO8601().toDate().withMessage('startTime must be a valid ISO date'),
  body('endTime')
    .isISO8601().toDate().withMessage('endTime must be a valid ISO date')
    .custom((end: string, { req }) => {
      if (new Date(end) <= new Date(req.body.startTime as string)) {
        throw new Error('endTime must be after startTime');
      }
      return true;
    }),
];

export const updateStatusRules = [
  param('id').isUUID(),
  body('action').isIn(['activate', 'close', 'publish']).withMessage('action must be activate, close, or publish'),
];

export const nominateRules = [
  param('id').isUUID(),
  body('position').trim().isLength({ min: 1, max: 100 }).withMessage('Position is required'),
  body('manifesto').trim().isLength({ min: 10, max: 2000 }).withMessage('Manifesto must be 10–2000 characters'),
  body('photoUrl').optional({ nullable: true }).isURL().withMessage('photoUrl must be a valid URL'),
];

export const reviewCandidateRules = [
  param('id').isUUID(),
  param('candidateId').isUUID(),
  body('approved').isBoolean().withMessage('approved must be a boolean'),
];

export const castVoteRules = [
  param('id').isUUID(),
  body('votes').isArray({ min: 1 }).withMessage('votes array is required'),
  body('votes.*.position').trim().isLength({ min: 1 }).withMessage('Each vote must have a position'),
  body('votes.*.candidateId').isUUID().withMessage('Each vote.candidateId must be a UUID'),
];

export const electionIdRule = [param('id').isUUID()];
export const candidateIdRule = [param('id').isUUID(), param('candidateId').isUUID()];
```

---

## Task 3: Backend service

**Files:**
- Create: `backend/src/modules/elections/elections.service.ts`

- [ ] **Step 1: Create the file**

```typescript
import crypto from 'crypto';
import { PrismaClient, ElectionStatus, UserRole } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import { AppError } from '../../utils/response';

// ── Public shapes ─────────────────────────────────────────────────────────────

export interface ElectionPublic {
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

export interface CandidatePublic {
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

export interface CandidateResult extends CandidatePublic {
  voteCount: number;
  percentage: number;
  isWinner: boolean;
}

export interface ElectionDetail extends ElectionPublic {
  candidates: CandidatePublic[];
  results: CandidateResult[] | null;
}

export interface StudentElectionView {
  election: ElectionPublic;
  candidates: CandidatePublic[];
  myNominations: CandidatePublic[];
  hasVoted: boolean;
  hasPaidDues: boolean;
  results: CandidateResult[] | null;
}

export interface CreateElectionDto {
  title: string;
  description?: string;
  positions: string[];
  eligibleLevels: string[];
  startTime: string;
  endTime: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ElectionsService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  // ── Admin ─────────────────────────────────────────────────────────────────

  async createElection(dto: CreateElectionDto, adminId: string, departmentId: string): Promise<ElectionPublic> {
    const election = await this.db.election.create({
      data: {
        departmentId,
        title: dto.title,
        description: dto.description ?? null,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        status: ElectionStatus.draft,
        eligibleLevels: dto.eligibleLevels,
        positions: dto.positions,
        createdById: adminId,
      },
    });
    return this.toElectionPublic(election, 0, 0, 0);
  }

  async listElections(departmentId: string): Promise<ElectionPublic[]> {
    const elections = await this.db.election.findMany({
      where: { departmentId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { candidates: true, votes: true } },
        candidates: { where: { isApproved: true }, select: { id: true } },
      },
    });

    // Auto-transition each
    const resolved = await Promise.all(elections.map((e) => this.resolveStatus(e)));

    return resolved.map((e) =>
      this.toElectionPublic(
        e,
        (e as typeof e & { _count: { candidates: number; votes: number } })._count.candidates,
        (e as typeof e & { candidates: { id: string }[] }).candidates.length,
        (e as typeof e & { _count: { candidates: number; votes: number } })._count.votes
      )
    );
  }

  async getElection(id: string, departmentId: string): Promise<ElectionDetail> {
    const election = await this.db.election.findFirst({
      where: { id, departmentId },
      include: {
        _count: { select: { candidates: true, votes: true } },
        candidates: {
          include: { user: { select: { name: true, userId: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!election) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Election not found');

    const resolved = await this.resolveStatus(election);

    const candidatesPublic: CandidatePublic[] = election.candidates.map((c) =>
      this.toCandidatePublic(c, c.user.name, c.user.userId)
    );

    const results = resolved.status === ElectionStatus.results_published
      ? await this.buildResults(id)
      : null;

    return {
      ...this.toElectionPublic(resolved, election._count.candidates, election.candidates.filter((c) => c.isApproved).length, election._count.votes),
      candidates: candidatesPublic,
      results,
    };
  }

  async updateStatus(id: string, departmentId: string, action: 'activate' | 'close' | 'publish'): Promise<ElectionPublic> {
    const election = await this.db.election.findFirst({ where: { id, departmentId } });
    if (!election) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Election not found');

    const validTransitions: Record<string, ElectionStatus> = {
      activate: ElectionStatus.active,
      close: ElectionStatus.closed,
      publish: ElectionStatus.results_published,
    };

    const requiredCurrentStatus: Record<string, ElectionStatus> = {
      activate: ElectionStatus.draft,
      close: ElectionStatus.active,
      publish: ElectionStatus.closed,
    };

    if (election.status !== requiredCurrentStatus[action]) {
      throw new AppError(
        400,
        'INVALID_STATUS_TRANSITION',
        `Cannot ${action} an election with status '${election.status}'`
      );
    }

    const updated = await this.db.election.update({
      where: { id },
      data: {
        status: validTransitions[action],
        ...(action === 'publish' ? { finalizedAt: new Date() } : {}),
      },
    });

    return this.toElectionPublic(updated, 0, 0, 0);
  }

  async deleteElection(id: string, departmentId: string): Promise<void> {
    const election = await this.db.election.findFirst({ where: { id, departmentId } });
    if (!election) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Election not found');
    if (election.status !== ElectionStatus.draft) {
      throw new AppError(400, 'ELECTION_NOT_DRAFT', 'Only draft elections can be deleted');
    }
    await this.db.election.delete({ where: { id } });
  }

  // ── Candidates ────────────────────────────────────────────────────────────

  async listCandidates(electionId: string, departmentId: string): Promise<CandidatePublic[]> {
    const election = await this.db.election.findFirst({ where: { id: electionId, departmentId } });
    if (!election) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Election not found');

    const candidates = await this.db.candidate.findMany({
      where: { electionId },
      include: { user: { select: { name: true, userId: true } } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    return candidates.map((c) => this.toCandidatePublic(c, c.user.name, c.user.userId));
  }

  async reviewCandidate(
    electionId: string,
    candidateId: string,
    adminId: string,
    departmentId: string,
    approved: boolean
  ): Promise<CandidatePublic> {
    const election = await this.db.election.findFirst({ where: { id: electionId, departmentId } });
    if (!election) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Election not found');

    if (election.status === ElectionStatus.closed || election.status === ElectionStatus.results_published) {
      throw new AppError(400, 'ELECTION_CLOSED', 'Cannot review candidates after election is closed');
    }

    const candidate = await this.db.candidate.findFirst({
      where: { id: candidateId, electionId },
      include: { user: { select: { name: true, userId: true } } },
    });
    if (!candidate) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Candidate not found');

    const updated = await this.db.candidate.update({
      where: { id: candidateId },
      data: { isApproved: approved, approvedById: adminId },
      include: { user: { select: { name: true, userId: true } } },
    });

    return this.toCandidatePublic(updated, updated.user.name, updated.user.userId);
  }

  // ── Student ───────────────────────────────────────────────────────────────

  async getActiveElection(departmentId: string, studentId: string): Promise<StudentElectionView | null> {
    const student = await this.db.user.findFirst({
      where: { id: studentId },
      select: { level: true },
    });
    if (!student) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Student not found');

    // Find any non-draft, non-deleted election where student's level is eligible
    const elections = await this.db.election.findMany({
      where: {
        departmentId,
        status: { not: ElectionStatus.draft },
      },
      orderBy: { startTime: 'desc' },
      take: 5,
    });

    // Also check draft elections that might have started
    const draftElections = await this.db.election.findMany({
      where: { departmentId, status: ElectionStatus.draft },
    });

    const allElections = [...elections, ...draftElections];

    // Resolve statuses (auto-transition)
    const resolved = await Promise.all(allElections.map((e) => this.resolveStatus(e)));

    // Find one that student is eligible for and isn't just a plain draft (no activity)
    const eligible = resolved.find(
      (e) =>
        e.eligibleLevels.includes(student.level) &&
        e.status !== ElectionStatus.draft
    );

    // Also include draft elections that are open for nominations
    const draftEligible = resolved.find(
      (e) =>
        e.eligibleLevels.includes(student.level) &&
        e.status === ElectionStatus.draft
    );

    const election = eligible ?? draftEligible;
    if (!election) return null;

    const [candidates, myNominations, votesExist, hasPaidDues] = await Promise.all([
      this.db.candidate.findMany({
        where: { electionId: election.id, isApproved: true },
        include: { user: { select: { name: true, userId: true } } },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
      this.db.candidate.findMany({
        where: { electionId: election.id, userId: studentId },
        include: { user: { select: { name: true, userId: true } } },
      }),
      this.db.vote.findFirst({ where: { electionId: election.id, voterId: studentId } }),
      this.checkDuesPaid(studentId),
    ]);

    const results =
      election.status === ElectionStatus.results_published
        ? await this.buildResults(election.id)
        : null;

    const [candidateCount, approvedCount, voteCount] = await Promise.all([
      this.db.candidate.count({ where: { electionId: election.id } }),
      this.db.candidate.count({ where: { electionId: election.id, isApproved: true } }),
      this.db.vote.count({ where: { electionId: election.id } }),
    ]);

    return {
      election: this.toElectionPublic(election, candidateCount, approvedCount, voteCount),
      candidates: candidates.map((c) => this.toCandidatePublic(c, c.user.name, c.user.userId)),
      myNominations: myNominations.map((c) => this.toCandidatePublic(c, c.user.name, c.user.userId)),
      hasVoted: !!votesExist,
      hasPaidDues,
      results,
    };
  }

  async submitNomination(
    electionId: string,
    studentId: string,
    departmentId: string,
    dto: { position: string; manifesto: string; photoUrl?: string }
  ): Promise<CandidatePublic> {
    const election = await this.db.election.findFirst({ where: { id: electionId, departmentId } });
    if (!election) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Election not found');

    const resolved = await this.resolveStatus(election);
    if (resolved.status !== ElectionStatus.draft) {
      throw new AppError(400, 'NOMINATIONS_CLOSED', 'Nominations are only accepted before the election starts');
    }

    const student = await this.db.user.findFirst({ where: { id: studentId }, select: { level: true, name: true, userId: true } });
    if (!student) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Student not found');

    if (!resolved.eligibleLevels.includes(student.level)) {
      throw new AppError(403, 'NOT_ELIGIBLE', 'Your level is not eligible for this election');
    }

    if (!(await this.checkDuesPaid(studentId))) {
      throw new AppError(403, 'DUES_NOT_PAID', 'Pay your NACOS dues to nominate yourself');
    }

    // Check valid position
    if (resolved.positions.length > 0 && !resolved.positions.includes(dto.position)) {
      throw new AppError(400, 'INVALID_POSITION', `Position '${dto.position}' is not valid for this election`);
    }

    // Check already nominated for this position
    const existing = await this.db.candidate.findFirst({
      where: { electionId, userId: studentId, position: dto.position },
    });
    if (existing) {
      throw new AppError(409, 'ALREADY_NOMINATED', `You have already nominated for ${dto.position}`);
    }

    const candidate = await this.db.candidate.create({
      data: {
        electionId,
        userId: studentId,
        position: dto.position,
        manifesto: dto.manifesto,
        photoUrl: dto.photoUrl ?? null,
        isApproved: false,
      },
    });

    return this.toCandidatePublic(candidate, student.name, student.userId);
  }

  async castVotes(
    electionId: string,
    studentId: string,
    departmentId: string,
    votes: { position: string; candidateId: string }[],
    ip: string
  ): Promise<void> {
    const election = await this.db.election.findFirst({ where: { id: electionId, departmentId } });
    if (!election) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Election not found');

    const resolved = await this.resolveStatus(election);
    if (resolved.status !== ElectionStatus.active) {
      throw new AppError(400, 'ELECTION_NOT_ACTIVE', 'Voting is not currently open');
    }

    const student = await this.db.user.findFirst({ where: { id: studentId }, select: { level: true } });
    if (!student) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Student not found');

    if (!resolved.eligibleLevels.includes(student.level)) {
      throw new AppError(403, 'NOT_ELIGIBLE', 'Your level is not eligible to vote in this election');
    }

    if (!(await this.checkDuesPaid(studentId))) {
      throw new AppError(403, 'DUES_NOT_PAID', 'Pay your NACOS dues to vote');
    }

    const existingVote = await this.db.vote.findFirst({ where: { electionId, voterId: studentId } });
    if (existingVote) throw new AppError(409, 'ALREADY_VOTED', 'You have already cast your vote');

    // Validate each candidate exists, is approved, and matches position
    for (const v of votes) {
      const candidate = await this.db.candidate.findFirst({
        where: { id: v.candidateId, electionId, position: v.position, isApproved: true },
      });
      if (!candidate) {
        throw new AppError(400, 'INVALID_CANDIDATE', `No approved candidate with id ${v.candidateId} for position '${v.position}'`);
      }
    }

    // Record all votes in a single transaction
    await this.db.$transaction(
      votes.map((v) =>
        this.db.vote.create({
          data: {
            electionId,
            voterId: studentId,
            candidateId: v.candidateId,
            position: v.position,
            voteToken: crypto.randomBytes(32).toString('hex'),
            ipAddress: ip,
          },
        })
      )
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async resolveStatus<T extends { id: string; status: ElectionStatus; startTime: Date; endTime: Date }>(
    election: T
  ): Promise<T> {
    const now = new Date();
    let newStatus: ElectionStatus | null = null;

    if (election.status === ElectionStatus.draft && now >= election.startTime) {
      newStatus = ElectionStatus.active;
    } else if (election.status === ElectionStatus.active && now >= election.endTime) {
      newStatus = ElectionStatus.closed;
    }

    if (newStatus) {
      const updated = await this.db.election.update({
        where: { id: election.id },
        data: { status: newStatus },
      });
      return { ...election, ...updated };
    }

    return election;
  }

  private async checkDuesPaid(studentId: string): Promise<boolean> {
    const year = new Date().getFullYear();
    const sessions = [`${year - 1}/${year}`, `${year}/${year + 1}`];
    const payment = await this.db.payment.findFirst({
      where: {
        userId: studentId,
        type: 'school_fees',
        status: 'success',
        sessionYear: { in: sessions },
      },
    });
    return payment !== null;
  }

  private async buildResults(electionId: string): Promise<CandidateResult[]> {
    const candidates = await this.db.candidate.findMany({
      where: { electionId, isApproved: true },
      include: {
        user: { select: { name: true, userId: true } },
        _count: { select: { votes: true } },
      },
      orderBy: { position: 'asc' },
    });

    const totalVoters = await this.db.vote.groupBy({
      by: ['position'],
      where: { electionId },
      _count: { id: true },
    });
    const votersByPosition = new Map(totalVoters.map((r) => [r.position, r._count.id]));

    // Determine winners per position
    const byPosition = new Map<string, typeof candidates>();
    for (const c of candidates) {
      if (!byPosition.has(c.position)) byPosition.set(c.position, []);
      byPosition.get(c.position)!.push(c);
    }

    const results: CandidateResult[] = [];
    for (const [, positionCandidates] of byPosition) {
      const maxVotes = Math.max(...positionCandidates.map((c) => c._count.votes));
      const totalForPosition = votersByPosition.get(positionCandidates[0].position) ?? 0;

      for (const c of positionCandidates) {
        results.push({
          ...this.toCandidatePublic(c, c.user.name, c.user.userId),
          voteCount: c._count.votes,
          percentage: totalForPosition > 0 ? Math.round((c._count.votes / totalForPosition) * 100) : 0,
          isWinner: c._count.votes === maxVotes && maxVotes > 0,
        });
      }
    }

    return results.sort((a, b) => a.position.localeCompare(b.position) || b.voteCount - a.voteCount);
  }

  private toElectionPublic(
    e: { id: string; title: string; description: string | null; status: ElectionStatus; positions: string[]; eligibleLevels: string[]; startTime: Date; endTime: Date; createdAt: Date },
    candidateCount: number,
    approvedCandidateCount: number,
    voteCount: number
  ): ElectionPublic {
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      status: e.status,
      positions: e.positions,
      eligibleLevels: e.eligibleLevels,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime.toISOString(),
      candidateCount,
      approvedCandidateCount,
      voteCount,
      createdAt: e.createdAt.toISOString(),
    };
  }

  private toCandidatePublic(
    c: { id: string; electionId: string; position: string; manifesto: string | null; photoUrl: string | null; isApproved: boolean; createdAt: Date },
    studentName: string,
    studentUserId: string
  ): CandidatePublic {
    return {
      id: c.id,
      electionId: c.electionId,
      position: c.position,
      manifesto: c.manifesto,
      photoUrl: c.photoUrl,
      isApproved: c.isApproved,
      studentName,
      studentUserId,
      createdAt: c.createdAt.toISOString(),
    };
  }
}

export const electionsService = new ElectionsService();
```

---

## Task 4: Backend controller

**Files:**
- Create: `backend/src/modules/elections/elections.controller.ts`

- [ ] **Step 1: Create the file**

```typescript
import { Request, Response } from 'express';
import { electionsService } from './elections.service';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest } from '../../types';

// ── Admin controllers ──────────────────────────────────────────────────────────

export const createElection = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const election = await electionsService.createElection(req.body, sub, departmentId);
  sendSuccess(res, election, 'Election created', 201);
});

export const listElections = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const elections = await electionsService.listElections(departmentId);
  sendSuccess(res, elections, 'Elections retrieved');
});

export const getElection = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const election = await electionsService.getElection(req.params.id, departmentId);
  sendSuccess(res, election, 'Election retrieved');
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const election = await electionsService.updateStatus(
    req.params.id,
    departmentId,
    req.body.action as 'activate' | 'close' | 'publish'
  );
  sendSuccess(res, election, `Election ${req.body.action}d`);
});

export const deleteElection = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  await electionsService.deleteElection(req.params.id, departmentId);
  sendSuccess(res, null, 'Election deleted');
});

export const listCandidates = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const candidates = await electionsService.listCandidates(req.params.id, departmentId);
  sendSuccess(res, candidates, 'Candidates retrieved');
});

export const reviewCandidate = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const candidate = await electionsService.reviewCandidate(
    req.params.id,
    req.params.candidateId,
    sub,
    departmentId,
    Boolean(req.body.approved)
  );
  sendSuccess(res, candidate, `Candidate ${req.body.approved ? 'approved' : 'rejected'}`);
});

// ── Student controllers ────────────────────────────────────────────────────────

export const getActiveElection = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const view = await electionsService.getActiveElection(departmentId, sub);
  sendSuccess(res, view, view ? 'Election retrieved' : 'No active election');
});

export const submitNomination = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const candidate = await electionsService.submitNomination(
    req.params.id,
    sub,
    departmentId,
    req.body as { position: string; manifesto: string; photoUrl?: string }
  );
  sendSuccess(res, candidate, 'Nomination submitted', 201);
});

export const castVotes = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  await electionsService.castVotes(
    req.params.id,
    sub,
    departmentId,
    req.body.votes as { position: string; candidateId: string }[],
    ip
  );
  sendSuccess(res, null, 'Vote cast successfully');
});
```

---

## Task 5: Backend routes + register in app.ts

**Files:**
- Create: `backend/src/modules/elections/elections.routes.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Create elections.routes.ts**

```typescript
import { Router } from 'express';
import { authenticate, requireAdmin, requireStudent } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { apiRateLimit } from '../../middleware/rate-limit.middleware';
import {
  createElectionRules, updateStatusRules, nominateRules,
  reviewCandidateRules, castVoteRules, electionIdRule, candidateIdRule,
} from './elections.validation';
import {
  createElection, listElections, getElection, updateStatus, deleteElection,
  listCandidates, reviewCandidate, getActiveElection, submitNomination, castVotes,
} from './elections.controller';

const router = Router();

router.use(authenticate, apiRateLimit);

// ── Student routes ─────────────────────────────────────────────────────────────

/** GET /api/v1/elections/active */
router.get('/active', requireStudent, getActiveElection);

/** POST /api/v1/elections/:id/candidates — student self-nominates */
router.post('/:id/candidates', requireStudent, validate([...electionIdRule, ...nominateRules]), submitNomination);

/** POST /api/v1/elections/:id/vote */
router.post('/:id/vote', requireStudent, validate([...electionIdRule, ...castVoteRules]), castVotes);

// ── Admin routes ───────────────────────────────────────────────────────────────

/** POST /api/v1/elections */
router.post('/', requireAdmin, validate(createElectionRules), createElection);

/** GET /api/v1/elections */
router.get('/', requireAdmin, listElections);

/** GET /api/v1/elections/:id */
router.get('/:id', requireAdmin, validate(electionIdRule), getElection);

/** PATCH /api/v1/elections/:id/status */
router.patch('/:id/status', requireAdmin, validate(updateStatusRules), updateStatus);

/** DELETE /api/v1/elections/:id */
router.delete('/:id', requireAdmin, validate(electionIdRule), deleteElection);

/** GET /api/v1/elections/:id/candidates */
router.get('/:id/candidates', requireAdmin, validate(electionIdRule), listCandidates);

/** PATCH /api/v1/elections/:id/candidates/:candidateId */
router.patch('/:id/candidates/:candidateId', requireAdmin, validate(reviewCandidateRules), reviewCandidate);

export default router;
```

- [ ] **Step 2: Register in app.ts**

In `backend/src/app.ts`, add the import after existing route imports:

```typescript
import electionsRoutes from './modules/elections/elections.routes';
```

Then add the route registration after `registrationRoutes`:

```typescript
app.use('/api/v1/elections', electionsRoutes);
```

- [ ] **Step 3: Backend typecheck**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit backend**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations \
        backend/src/modules/elections \
        backend/src/app.ts
git commit -m "feat: elections module backend — service, controller, routes, auto-transitions"
```

---

## Task 6: Frontend types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Append election types at the end of the file**

```typescript
// ── Elections ─────────────────────────────────────────────────────────────────

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

export interface ElectionDetail extends Election {
  candidates: ElectionCandidate[];
  results: CandidateResult[] | null;
}

export interface StudentElectionView {
  election: Election;
  candidates: ElectionCandidate[];
  myNominations: ElectionCandidate[];
  hasVoted: boolean;
  hasPaidDues: boolean;
  results: CandidateResult[] | null;
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

## Task 7: Frontend API client

**Files:**
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Append API objects at the end of client.ts**

```typescript
// ── Elections API (admin) ─────────────────────────────────────────────────────

export const electionsAdminApi = {
  list: () =>
    api.get<{ success: true; data: import('../types').Election[] }>('/elections'),

  create: (body: import('../types').CreateElectionForm) =>
    api.post<{ success: true; data: import('../types').Election }>('/elections', body),

  get: (id: string) =>
    api.get<{ success: true; data: import('../types').ElectionDetail }>(`/elections/${id}`),

  updateStatus: (id: string, action: 'activate' | 'close' | 'publish') =>
    api.patch<{ success: true; data: import('../types').Election }>(`/elections/${id}/status`, { action }),

  delete: (id: string) =>
    api.delete(`/elections/${id}`),

  listCandidates: (id: string) =>
    api.get<{ success: true; data: import('../types').ElectionCandidate[] }>(`/elections/${id}/candidates`),

  reviewCandidate: (id: string, candidateId: string, approved: boolean) =>
    api.patch<{ success: true; data: import('../types').ElectionCandidate }>(
      `/elections/${id}/candidates/${candidateId}`,
      { approved }
    ),
};

// ── Elections API (student) ───────────────────────────────────────────────────

export const electionsStudentApi = {
  getActive: () =>
    api.get<{ success: true; data: import('../types').StudentElectionView | null }>('/elections/active'),

  nominate: (id: string, body: { position: string; manifesto: string; photoUrl?: string }) =>
    api.post<{ success: true; data: import('../types').ElectionCandidate }>(`/elections/${id}/candidates`, body),

  vote: (id: string, body: import('../types').VoteBallot) =>
    api.post<{ success: true; data: null }>(`/elections/${id}/vote`, body),
};
```

---

## Task 8: Admin — ElectionListPage

**Files:**
- Create: `frontend/src/pages/admin/ElectionListPage.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { electionsAdminApi, extractApiError } from '../../api/client';
import type { Election, ElectionStatus } from '../../types';
import { Plus, Vote, Users, CheckCircle, Clock } from 'lucide-react';

const STATUS_CONFIG: Record<ElectionStatus, { label: string; color: string; dot: string }> = {
  draft:             { label: 'Draft',     color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
  active:            { label: 'Active',    color: 'bg-brand-100 text-brand-800',   dot: 'bg-brand-500'  },
  closed:            { label: 'Closed',    color: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400'   },
  results_published: { label: 'Published', color: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-500'   },
};

const TABS: { key: ElectionStatus | 'all'; label: string }[] = [
  { key: 'all',             label: 'All'       },
  { key: 'draft',           label: 'Draft'     },
  { key: 'active',          label: 'Active'    },
  { key: 'closed',          label: 'Closed'    },
  { key: 'results_published', label: 'Published' },
];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ElectionListPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<ElectionStatus | 'all'>('all');

  useEffect(() => {
    electionsAdminApi.list()
      .then((r) => setElections(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'all' ? elections : elections.filter((e) => e.status === tab);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Elections</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage departmental elections</p>
        </div>
        <Link to="/admin/elections/new"
          className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Election
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'border-b-2 border-brand-700 text-brand-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            {t.key !== 'all' && (
              <span className="ml-1.5 text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {elections.filter((e) => e.status === t.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <Vote className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">No elections yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first election to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((election) => {
            const cfg = STATUS_CONFIG[election.status];
            return (
              <Link key={election.id} to={`/admin/elections/${election.id}`}
                className="block bg-white rounded-2xl border border-gray-200 hover:border-brand-300 hover:shadow-md p-5 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      {election.status === 'active' && (
                        <span className="text-[10px] text-brand-600 font-semibold animate-pulse">● Live</span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 truncate">{election.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {fmt(election.startTime)} → {fmt(election.endTime)}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3 h-3" />
                        {election.approvedCandidateCount} candidates
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <CheckCircle className="w-3 h-3" />
                        {election.voteCount} votes
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {election.positions.length} positions
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0 text-right">
                    {election.eligibleLevels.join(', ')}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## Task 9: Admin — CreateElectionPage

**Files:**
- Create: `frontend/src/pages/admin/CreateElectionPage.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { electionsAdminApi, extractApiError } from '../../api/client';
import { X, Plus } from 'lucide-react';

const LEVEL_OPTIONS = ['L100', 'L200', 'L300', 'L400'];

export default function CreateElectionPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [positions, setPositions] = useState<string[]>(['President', 'Vice President', 'Secretary']);
  const [positionInput, setPositionInput] = useState('');
  const [eligibleLevels, setEligibleLevels] = useState<string[]>(['L100', 'L200', 'L300', 'L400']);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addPosition = () => {
    const p = positionInput.trim();
    if (p && !positions.includes(p)) {
      setPositions([...positions, p]);
      setPositionInput('');
    }
  };

  const removePosition = (p: string) => setPositions(positions.filter((x) => x !== p));

  const toggleLevel = (l: string) =>
    setEligibleLevels((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || positions.length === 0 || eligibleLevels.length === 0 || !startTime || !endTime) {
      setError('All fields are required and at least one position and level must be selected.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await electionsAdminApi.create({
        title: title.trim(),
        description: description.trim(),
        positions,
        eligibleLevels,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      navigate(`/admin/elections/${res.data.data.id}`);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Election</h1>
        <p className="text-sm text-gray-500 mt-0.5">Set up a departmental election for students to vote in</p>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
        )}

        {/* Title */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-800 mb-1">Election Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. NACOS Executive Elections 2025"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <label className="block text-sm font-semibold text-gray-800 mb-1 mt-4">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            rows={3} placeholder="Briefly describe this election..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </div>

        {/* Positions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-800 mb-3">Positions *</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {positions.map((p) => (
              <span key={p} className="flex items-center gap-1.5 bg-brand-50 text-brand-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-brand-200">
                {p}
                <button type="button" onClick={() => removePosition(p)} className="hover:text-red-600 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={positionInput} onChange={(e) => setPositionInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPosition(); } }}
              placeholder="Type position and press Enter"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <button type="button" onClick={addPosition}
              className="flex items-center gap-1.5 text-xs font-semibold bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 px-3 py-2 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Eligible Levels */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-800 mb-3">Eligible Levels *</label>
          <div className="flex gap-3 flex-wrap">
            {LEVEL_OPTIONS.map((l) => (
              <label key={l} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-semibold ${
                eligibleLevels.includes(l)
                  ? 'bg-brand-50 border-brand-400 text-brand-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
                <input type="checkbox" className="hidden" checked={eligibleLevels.includes(l)}
                  onChange={() => toggleLevel(l)} />
                {l.replace('L', '')} Level
              </label>
            ))}
          </div>
        </div>

        {/* Date/Time */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Start Date & Time *</label>
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">End Date & Time *</label>
              <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/admin/elections')}
            className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60">
            {submitting ? 'Creating…' : 'Create Election'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## Task 10: Admin — ElectionDetailPage

**Files:**
- Create: `frontend/src/pages/admin/ElectionDetailPage.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { electionsAdminApi, extractApiError } from '../../api/client';
import type { ElectionDetail, ElectionCandidate, CandidateResult, ElectionStatus } from '../../types';
import { CheckCircle, XCircle, Clock, Users, TrendingUp, ArrowLeft, Trophy } from 'lucide-react';

type Tab = 'overview' | 'candidates' | 'results';

const STATUS_STEPS: ElectionStatus[] = ['draft', 'active', 'closed', 'results_published'];
const STATUS_LABELS: Record<ElectionStatus, string> = {
  draft: 'Draft', active: 'Active', closed: 'Closed', results_published: 'Published',
};

function Countdown({ target, label }: { target: string; label: string }) {
  const [diff, setDiff] = useState(new Date(target).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setDiff(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (diff <= 0) return <span className="text-xs text-gray-500">{label} (ended)</span>;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <span className="text-xs font-mono text-brand-700 bg-brand-50 px-2 py-1 rounded-lg">
      {label}: {h}h {m}m {s}s
    </span>
  );
}

export default function ElectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [election, setElection] = useState<ElectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    electionsAdminApi.get(id)
      .then((r) => setElection(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (action: 'activate' | 'close' | 'publish') => {
    if (!id) return;
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this election?`)) return;
    setActioning(true);
    setActionError('');
    try {
      await electionsAdminApi.updateStatus(id, action);
      load();
    } catch (err) {
      setActionError(extractApiError(err));
    } finally {
      setActioning(false);
    }
  };

  const handleReview = async (candidateId: string, approved: boolean) => {
    if (!id) return;
    try {
      await electionsAdminApi.reviewCandidate(id, candidateId, approved);
      load();
    } catch (err) {
      setActionError(extractApiError(err));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-10 h-10 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
    </div>
  );

  if (error || !election) return (
    <div className="p-6">
      <p className="text-red-600 mb-4">{error || 'Election not found'}</p>
      <Link to="/admin/elections" className="text-brand-700 hover:underline text-sm">← Back</Link>
    </div>
  );

  const currentStepIdx = STATUS_STEPS.indexOf(election.status);
  const byPosition = election.candidates.reduce((acc, c) => {
    if (!acc[c.position]) acc[c.position] = [];
    acc[c.position].push(c);
    return acc;
  }, {} as Record<string, ElectionCandidate[]>);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <Link to="/admin/elections" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-700 mb-2 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Elections
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{election.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {election.positions.join(' · ')} · {election.eligibleLevels.join(', ')}
            </p>
          </div>
          <div className="flex-shrink-0">
            {election.status === 'draft' && (
              <button onClick={() => void handleAction('activate')} disabled={actioning}
                className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60">
                Activate Now
              </button>
            )}
            {election.status === 'active' && (
              <button onClick={() => void handleAction('close')} disabled={actioning}
                className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60">
                Close Election
              </button>
            )}
            {election.status === 'closed' && (
              <button onClick={() => void handleAction('publish')} disabled={actioning}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60">
                Publish Results
              </button>
            )}
          </div>
        </div>
        {actionError && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs">{actionError}</div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {(['overview', 'candidates', 'results'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'border-b-2 border-brand-700 text-brand-800' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Status timeline */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Status Timeline</h2>
            <div className="flex items-center gap-0">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`flex flex-col items-center flex-1 ${i < STATUS_STEPS.length - 1 ? '' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      i < currentStepIdx ? 'bg-brand-600 border-brand-600 text-white'
                      : i === currentStepIdx ? 'bg-white border-brand-600 text-brand-700 ring-2 ring-brand-200'
                      : 'bg-gray-100 border-gray-200 text-gray-400'
                    }`}>
                      {i < currentStepIdx ? '✓' : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 font-semibold ${i <= currentStepIdx ? 'text-brand-700' : 'text-gray-400'}`}>
                      {STATUS_LABELS[step]}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 ${i < currentStepIdx ? 'bg-brand-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Countdown + stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Users, label: 'Nominations', value: election.candidateCount },
              { icon: CheckCircle, label: 'Approved', value: election.approvedCandidateCount },
              { icon: TrendingUp, label: 'Votes Cast', value: election.voteCount },
              { icon: Clock, label: 'Positions', value: election.positions.length },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
                <s.icon className="w-5 h-5 text-brand-600 mx-auto mb-2" />
                <div className="text-2xl font-black text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Countdown */}
          {election.status === 'draft' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-800">Nominations open</p>
                <p className="text-yellow-700 text-xs mt-0.5">Election starts: {new Date(election.startTime).toLocaleString('en-NG')}</p>
              </div>
              <div className="ml-auto">
                <Countdown target={election.startTime} label="Starts in" />
              </div>
            </div>
          )}
          {election.status === 'active' && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse flex-shrink-0" />
              <p className="font-semibold text-brand-800">Voting is live</p>
              <div className="ml-auto">
                <Countdown target={election.endTime} label="Closes in" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Candidates tab */}
      {tab === 'candidates' && (
        <div className="space-y-5">
          {Object.keys(byPosition).length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-700">No nominations yet</p>
              <p className="text-sm text-gray-400 mt-1">Students will submit nominations when the election opens.</p>
            </div>
          ) : (
            Object.entries(byPosition).map(([position, candidates]) => (
              <div key={position} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">{position}</h3>
                  <span className="text-xs text-gray-400">{candidates.filter((c) => c.isApproved).length} / {candidates.length} approved</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {candidates.map((c) => (
                    <div key={c.id} className="flex items-start gap-4 px-5 py-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {c.studentName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{c.studentName}</p>
                        <p className="text-xs text-gray-400">{c.studentUserId}</p>
                        {c.manifesto && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{c.manifesto}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.isApproved ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
                            <CheckCircle className="w-3 h-3" /> Approved
                          </span>
                        ) : (
                          <>
                            <button onClick={() => void handleReview(c.id, true)}
                              className="text-xs font-bold text-brand-700 border border-brand-200 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors">
                              Approve
                            </button>
                            <button onClick={() => void handleReview(c.id, false)}
                              className="text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Results tab */}
      {tab === 'results' && (
        <ResultsTab results={election.results} election={election} />
      )}
    </div>
  );
}

function ResultsTab({ results, election }: { results: CandidateResult[] | null; election: ElectionDetail }) {
  if (!results || results.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
        <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">
          {election.status === 'draft' || election.status === 'active'
            ? 'Results will appear after voting closes'
            : 'No votes have been cast'}
        </p>
      </div>
    );
  }

  const byPosition = results.reduce((acc, r) => {
    if (!acc[r.position]) acc[r.position] = [];
    acc[r.position].push(r);
    return acc;
  }, {} as Record<string, CandidateResult[]>);

  return (
    <div className="space-y-5">
      {election.status !== 'results_published' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 font-semibold">
          ⚠️ Results are only visible to admin until published. Publish to show students.
        </div>
      )}
      {Object.entries(byPosition).map(([position, candidates]) => (
        <div key={position} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">{position}</h3>
            <span className="text-xs text-gray-400">{candidates.reduce((s, c) => s + c.voteCount, 0)} total votes</span>
          </div>
          <div className="p-5 space-y-3">
            {candidates.map((c) => (
              <div key={c.id} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                  {c.studentName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-900 truncate">{c.studentName}</span>
                    {c.isWinner && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-yellow-700 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        <Trophy className="w-2.5 h-2.5" /> Winner
                      </span>
                    )}
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${c.isWinner ? 'bg-brand-600' : 'bg-gray-300'}`}
                      style={{ width: `${c.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-black text-gray-900">{c.voteCount}</div>
                  <div className="text-[10px] text-gray-400">{c.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Task 11: Student — ElectionsPage rewrite

**Files:**
- Rewrite: `frontend/src/pages/student/ElectionsPage.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { electionsStudentApi, extractApiError } from '../../api/client';
import type { StudentElectionView, ElectionCandidate, CandidateResult } from '../../types';
import { Vote, Clock, CheckCircle, Trophy, AlertCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── Countdown ─────────────────────────────────────────────────────────────────

function Countdown({ target }: { target: string }) {
  const [diff, setDiff] = useState(new Date(target).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setDiff(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (diff <= 0) return <span className="font-mono text-sm text-gray-500">Ended</span>;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <span className="font-mono text-sm font-bold text-brand-700">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

// ── Vote Modal ────────────────────────────────────────────────────────────────

function VoteModal({
  positions, candidates, onSubmit, onClose, submitting,
}: {
  positions: string[];
  candidates: ElectionCandidate[];
  onSubmit: (votes: { position: string; candidateId: string }[]) => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const byPosition = positions.reduce((acc, p) => {
    acc[p] = candidates.filter((c) => c.position === p);
    return acc;
  }, {} as Record<string, ElectionCandidate[]>);

  const allSelected = positions.every((p) => !!selections[p]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)' }}>
          <div>
            <p className="text-white font-bold">Cast Your Vote</p>
            <p className="text-brand-300 text-xs mt-0.5">Select one candidate per position</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {positions.map((pos) => (
            <div key={pos}>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">{pos}</p>
              <div className="space-y-2">
                {byPosition[pos]?.map((c) => (
                  <label key={c.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selections[pos] === c.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-brand-300'
                    }`}>
                    <input type="radio" name={pos} value={c.id} className="hidden"
                      checked={selections[pos] === c.id}
                      onChange={() => setSelections((prev) => ({ ...prev, [pos]: c.id }))} />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                      {c.studentName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.studentName}</p>
                      {c.manifesto && (
                        <p className="text-xs text-gray-500 truncate">{c.manifesto.slice(0, 60)}…</p>
                      )}
                    </div>
                    {selections[pos] === c.id && (
                      <CheckCircle className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5 flex-shrink-0">
          <button
            onClick={() => {
              if (allSelected) {
                onSubmit(positions.map((p) => ({ position: p, candidateId: selections[p] })));
              }
            }}
            disabled={!allSelected || submitting}
            className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-60 text-sm"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Submitting…
              </span>
            ) : allSelected ? 'Submit My Votes' : `Select all ${positions.length} positions to continue`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ElectionsPage() {
  const [view, setView] = useState<StudentElectionView | null | 'loading'>('loading');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [voting, setVoting] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [showNomForm, setShowNomForm] = useState<string | null>(null); // position
  const [nomManifesto, setNomManifesto] = useState('');
  const [nomPhoto, setNomPhoto] = useState('');
  const [nomSubmitting, setNomSubmitting] = useState(false);
  const [nomError, setNomError] = useState('');

  const load = () => {
    setView('loading');
    electionsStudentApi.getActive()
      .then((r) => setView(r.data.data))
      .catch((err) => { setError(extractApiError(err)); setView(null); });
  };

  useEffect(() => { load(); }, []);

  const handleVote = async (votes: { position: string; candidateId: string }[]) => {
    if (!view || view === 'loading' || !view.election) return;
    setVoting(true);
    try {
      await electionsStudentApi.vote(view.election.id, { votes });
      setVoteSuccess(true);
      setShowModal(false);
      load();
    } catch (err) {
      alert(extractApiError(err));
    } finally {
      setVoting(false);
    }
  };

  const handleNominate = async (position: string) => {
    if (!view || view === 'loading' || !view.election) return;
    if (!nomManifesto.trim() || nomManifesto.trim().length < 10) {
      setNomError('Manifesto must be at least 10 characters.');
      return;
    }
    setNomSubmitting(true);
    setNomError('');
    try {
      await electionsStudentApi.nominate(view.election.id, {
        position,
        manifesto: nomManifesto.trim(),
        photoUrl: nomPhoto.trim() || undefined,
      });
      setShowNomForm(null);
      setNomManifesto('');
      setNomPhoto('');
      load();
    } catch (err) {
      setNomError(extractApiError(err));
    } finally {
      setNomSubmitting(false);
    }
  };

  if (view === 'loading') {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="w-10 h-10 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  // No election for this student's level
  if (!view) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Departmental Elections</h1>
        <p className="text-sm text-gray-500 mb-8">Vote for your student union representatives</p>
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <Vote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Elections</h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            No elections are currently open for your level. You'll receive a notification when one opens.
          </p>
        </div>
      </div>
    );
  }

  const { election, candidates, myNominations, hasVoted, hasPaidDues, results } = view;
  const nomPositions = election.positions.filter(
    (p) => !myNominations.some((n) => n.position === p)
  );
  const byPosition = election.positions.reduce((acc, p) => {
    acc[p] = candidates.filter((c) => c.position === p);
    return acc;
  }, {} as Record<string, ElectionCandidate[]>);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {showModal && (
        <VoteModal
          positions={election.positions}
          candidates={candidates}
          onSubmit={handleVote}
          onClose={() => setShowModal(false)}
          submitting={voting}
        />
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Departmental Elections</h1>
      <p className="text-sm text-gray-500 mb-5">Vote for your student union representatives</p>

      {/* Election header card */}
      <div className="rounded-2xl overflow-hidden shadow-sm mb-5"
        style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)' }}>
        <div className="p-5">
          <p className="text-brand-300 text-xs font-bold uppercase tracking-widest mb-1">
            {election.status === 'draft' ? 'Nominations Open' :
             election.status === 'active' ? '🗳️ Voting Live' :
             election.status === 'closed' ? 'Voting Closed' : '✅ Results Published'}
          </p>
          <h2 className="text-white font-bold text-lg mb-2">{election.title}</h2>
          {election.description && (
            <p className="text-brand-300 text-xs mb-3">{election.description}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <span className="text-xs text-brand-300">{election.positions.length} positions</span>
              <span className="text-xs text-brand-300">{election.approvedCandidateCount} candidates</span>
              <span className="text-xs text-brand-300">{election.voteCount} votes</span>
            </div>
            {election.status === 'active' && (
              <div className="text-right">
                <p className="text-[10px] text-brand-400 mb-0.5">Closes in</p>
                <Countdown target={election.endTime} />
              </div>
            )}
            {election.status === 'draft' && (
              <div className="text-right">
                <p className="text-[10px] text-brand-400 mb-0.5">Starts</p>
                <p className="text-xs text-brand-200">{new Date(election.startTime).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dues gate warning */}
      {!hasPaidDues && (election.status === 'draft' || election.status === 'active') && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3 mb-5 text-sm">
          <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-orange-800">NACOS Due required</p>
            <p className="text-xs text-orange-700 mt-0.5">Pay your NACOS dues to nominate or vote.</p>
          </div>
          <Link to="/student/school-fees"
            className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-orange-800 underline">
            Pay Now <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* ── DRAFT: Nomination state ──────────────────────────────────────── */}
      {election.status === 'draft' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-900">Positions</h2>
          {election.positions.map((pos) => {
            const myNom = myNominations.find((n) => n.position === pos);
            return (
              <div key={pos} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{pos}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {candidates.filter((c) => c.position === pos).length} nominee(s)
                    </p>
                  </div>
                  {myNom ? (
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                      myNom.isApproved
                        ? 'bg-brand-100 text-brand-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {myNom.isApproved ? '✅ Approved' : '⏳ Pending review'}
                    </span>
                  ) : hasPaidDues ? (
                    <button
                      onClick={() => setShowNomForm(showNomForm === pos ? null : pos)}
                      className="text-xs font-bold text-brand-700 border border-brand-200 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Nominate Myself
                    </button>
                  ) : null}
                </div>
                <AnimatePresence>
                  {showNomForm === pos && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
                        {nomError && (
                          <p className="text-xs text-red-600">{nomError}</p>
                        )}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Manifesto *</label>
                          <textarea rows={4} value={nomManifesto} onChange={(e) => setNomManifesto(e.target.value)}
                            placeholder="Tell students why you're the best candidate for this position (min 10 characters)…"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Photo URL (optional)</label>
                          <input value={nomPhoto} onChange={(e) => setNomPhoto(e.target.value)}
                            placeholder="https://…"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setShowNomForm(null); setNomError(''); setNomManifesto(''); setNomPhoto(''); }}
                            className="flex-1 border border-gray-200 text-gray-600 text-xs font-semibold py-2.5 rounded-xl hover:bg-gray-50">
                            Cancel
                          </button>
                          <button onClick={() => void handleNominate(pos)} disabled={nomSubmitting}
                            className="flex-1 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60">
                            {nomSubmitting ? 'Submitting…' : 'Submit Nomination'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ACTIVE: Voting state ─────────────────────────────────────────── */}
      {election.status === 'active' && (
        <div className="space-y-4">
          {voteSuccess || hasVoted ? (
            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 text-center">
              <CheckCircle className="w-10 h-10 text-brand-600 mx-auto mb-3" />
              <p className="font-bold text-brand-800 text-lg">Your vote has been cast!</p>
              <p className="text-brand-600 text-sm mt-1">Thank you for participating in the election.</p>
            </div>
          ) : hasPaidDues ? (
            <button onClick={() => setShowModal(true)}
              className="w-full flex items-center justify-center gap-3 bg-brand-700 hover:bg-brand-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg text-sm">
              <Vote className="w-5 h-5" />
              Cast Your Vote
            </button>
          ) : null}

          {/* Candidate cards per position */}
          {election.positions.map((pos) => (
            <div key={pos} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">{pos}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {byPosition[pos]?.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-gray-400">No approved candidates for this position.</p>
                ) : (
                  byPosition[pos]?.map((c) => (
                    <div key={c.id} className="flex items-start gap-3 px-5 py-4">
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt={c.studentName}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {c.studentName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{c.studentName}</p>
                        <p className="text-xs text-gray-400">{c.studentUserId}</p>
                        {c.manifesto && (
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{c.manifesto}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CLOSED ──────────────────────────────────────────────────────── */}
      {election.status === 'closed' && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-700">Results are being tallied</p>
          <p className="text-sm text-gray-400 mt-1">Check back soon for the final results.</p>
        </div>
      )}

      {/* ── RESULTS PUBLISHED ────────────────────────────────────────────── */}
      {election.status === 'results_published' && results && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-900">Final Results</h2>
          {election.positions.map((pos) => {
            const posResults = results.filter((r) => r.position === pos)
              .sort((a, b) => b.voteCount - a.voteCount);
            const winner = posResults.find((r) => r.isWinner);

            return (
              <div key={pos} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">{pos}</h3>
                </div>
                {winner && (
                  <div className="mx-5 mt-4 flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <Trophy className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-yellow-800 uppercase tracking-wide">Winner</p>
                      <p className="font-black text-gray-900">{winner.studentName}</p>
                      <p className="text-xs text-yellow-700">{winner.voteCount} votes · {winner.percentage}%</p>
                    </div>
                  </div>
                )}
                <div className="p-5 space-y-3">
                  {posResults.map((r) => (
                    <div key={r.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                        {r.studentName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{r.studentName}</p>
                        <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div className={`h-full rounded-full ${r.isWinner ? 'bg-brand-600' : 'bg-gray-300'}`}
                            style={{ width: `${r.percentage}%` }} />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-black text-gray-900">{r.voteCount}</div>
                        <div className="text-[10px] text-gray-400">{r.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## Task 12: Wire up admin routes + unlock Elections nav + typecheck + commit

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/AdminLayout.tsx`

- [ ] **Step 1: Add imports to App.tsx**

After existing admin page imports, add:

```typescript
import ElectionListPage from './pages/admin/ElectionListPage';
import CreateElectionPage from './pages/admin/CreateElectionPage';
import ElectionDetailPage from './pages/admin/ElectionDetailPage';
```

- [ ] **Step 2: Add admin election routes inside the AdminLayout block in App.tsx**

After the existing gradebook routes, add:

```tsx
<Route path="/admin/elections"          element={<ElectionListPage />} />
<Route path="/admin/elections/new"      element={<CreateElectionPage />} />
<Route path="/admin/elections/:id"      element={<ElectionDetailPage />} />
```

- [ ] **Step 3: Remove the Phase 3 lock from Elections in AdminLayout.tsx**

In `frontend/src/components/AdminLayout.tsx`, change the Elections item in `NAV_SECTIONS` from:

```typescript
{ icon: Vote, label: 'Elections', to: '/admin/elections', phase: 'Phase 3' },
```

to:

```typescript
{ icon: Vote, label: 'Elections', to: '/admin/elections', phase: null },
```

- [ ] **Step 4: Frontend typecheck**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Backend typecheck**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/index.ts \
        frontend/src/api/client.ts \
        frontend/src/pages/admin/ElectionListPage.tsx \
        frontend/src/pages/admin/CreateElectionPage.tsx \
        frontend/src/pages/admin/ElectionDetailPage.tsx \
        frontend/src/pages/student/ElectionsPage.tsx \
        frontend/src/components/AdminLayout.tsx \
        frontend/src/App.tsx

git commit -m "feat: elections module — admin CRUD, candidate approval, student voting, results"
```

---

## Self-Review

**Spec coverage:**
- ✅ Backend routes: all 10 endpoints specified
- ✅ Auto-transition: `resolveStatus` called in every service method
- ✅ State machine: draft→active→closed→results_published with valid transition checks
- ✅ Schema migration: `positions String[]` added
- ✅ Student nomination flow: dues check, eligibility check, duplicate check, position validity
- ✅ Vote casting: dues check, eligibility, already-voted check, candidate validation, DB transaction
- ✅ Admin candidate review: approve/reject with state guard
- ✅ Results calculation: vote counts, percentages, winner per position
- ✅ Admin 3 pages: list, create, detail with 3 tabs
- ✅ Student 5 states: no election, draft (nominations), active (voting), closed, results_published
- ✅ Dues gate: shown on nomination and voting with link to payment page
- ✅ Vote modal: one radio per position, all positions must be selected before submit
- ✅ AdminLayout lock removed

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:** `ElectionCandidate` (Task 6) matches `toCandidatePublic` return in service (Task 3). `ElectionDetail.candidates` is `ElectionCandidate[]` used correctly in Task 10. `CandidateResult extends ElectionCandidate` with `voteCount/percentage/isWinner` — used consistently in Tasks 10 and 11. `VoteBallot.votes` array shape matches `castVotes` param.
