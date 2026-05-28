import { body, query } from 'express-validator';
import { Program, Level, UserStatus } from '@prisma/client';

export const createUserRules = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('A valid email address is required'),
  body('phone')
    .trim()
    .matches(/^\+?[0-9]{7,15}$/)
    .withMessage('Phone number must be 7–15 digits, optionally prefixed with +'),
  body('program')
    .isIn(Object.values(Program))
    .withMessage(`Program must be one of: ${Object.values(Program).join(', ')}`),
  body('level')
    .isIn(Object.values(Level))
    .withMessage(`Level must be one of: ${Object.values(Level).join(', ')}`),
];

export const listUsersRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
  query('level').optional().isIn(Object.values(Level)).withMessage('Invalid level'),
  query('program').optional().isIn(Object.values(Program)).withMessage('Invalid program'),
  query('status').optional().isIn(Object.values(UserStatus)).withMessage('Invalid status'),
];

export const updateUserRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('A valid email address is required'),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9]{7,15}$/)
    .withMessage('Phone number must be 7–15 digits'),
  body('level')
    .optional()
    .isIn(Object.values(Level))
    .withMessage('Invalid level'),
  body('program')
    .optional()
    .isIn(Object.values(Program))
    .withMessage('Invalid program'),
  body('status')
    .optional()
    .isIn([UserStatus.validated, UserStatus.suspended])
    .withMessage('Status must be validated or suspended'),
];
