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
