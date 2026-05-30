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
