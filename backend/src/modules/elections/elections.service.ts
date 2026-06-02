import crypto from 'crypto';
import { PrismaClient, ElectionStatus, UserRole, Prisma } from '@prisma/client';
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

    this.db.auditLog.create({
      data: {
        actorId: adminId,
        action: 'ELECTION_CREATED',
        entityType: 'election',
        entityId: election.id,
        newValue: { title: election.title, status: election.status } as Prisma.InputJsonValue,
      },
    }).catch((e: unknown) => console.error('[ElectionsService] Audit log failed:', e));

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

  async updateStatus(id: string, departmentId: string, action: 'activate' | 'close' | 'publish', adminId?: string): Promise<ElectionPublic> {
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

    if (adminId) {
      const newStatus = validTransitions[action];
      const auditAction =
        newStatus === ElectionStatus.active
          ? 'ELECTION_OPENED'
          : newStatus === ElectionStatus.closed
          ? 'ELECTION_CLOSED'
          : 'ELECTION_RESULTS_PUBLISHED';
      this.db.auditLog.create({
        data: {
          actorId: adminId,
          action: auditAction,
          entityType: 'election',
          entityId: id,
          newValue: { status: newStatus } as Prisma.InputJsonValue,
        },
      }).catch((e: unknown) => console.error('[ElectionsService] Audit log failed:', e));
    }

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
