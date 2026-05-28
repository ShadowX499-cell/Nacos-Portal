import { body } from 'express-validator';

export const validateAccountRules = [
  body('userId')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .matches(/^NACOS\/[A-Z]+\/\d{4}\/\d{3,}$/)
    .withMessage('Invalid User ID format (expected NACOS/PROG/YEAR/SEQ)'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  body('confirmPassword')
    .custom((value: string, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

export const loginRules = [
  body('userId').trim().notEmpty().withMessage('User ID is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordRules = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('A valid email address is required'),
];

export const resetPasswordRules = [
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  body('confirmPassword')
    .custom((value: string, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];
