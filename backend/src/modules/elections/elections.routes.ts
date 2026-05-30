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
