import { body, param, query } from 'express-validator';
import { Level, Semester } from '@prisma/client';

export const createGradebookRules = [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Name must be 2–150 characters'),
  body('level').isIn(Object.values(Level)).withMessage(`Level must be one of: ${Object.values(Level).join(', ')}`),
  body('session')
    .trim()
    .matches(/^\d{4}\/\d{4}$/)
    .withMessage('Session must be in format YYYY/YYYY (e.g. 2024/2025)'),
  body('semester')
    .isIn(Object.values(Semester))
    .withMessage(`Semester must be one of: ${Object.values(Semester).join(', ')}`),
];

export const addCourseRules = [
  body('courseCode').trim().isLength({ min: 2, max: 20 }).withMessage('Course code must be 2–20 characters'),
  body('courseTitle').trim().isLength({ min: 2, max: 150 }).withMessage('Course title must be 2–150 characters'),
  body('creditUnits').isInt({ min: 1, max: 6 }).withMessage('Credit units must be 1–6'),
];

export const upsertGradesRules = [
  body('grades').isArray({ min: 1 }).withMessage('grades must be a non-empty array'),
  body('grades.*.userId').isUUID().withMessage('Each grade entry must have a valid userId (UUID)'),
  body('grades.*.caScore')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 30 })
    .withMessage('caScore must be 0–30'),
  body('grades.*.examScore')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 70 })
    .withMessage('examScore must be 0–70'),
];

export const listGradebooksRules = [
  query('level').optional().isIn(Object.values(Level)).withMessage('Invalid level'),
  query('semester').optional().isIn(Object.values(Semester)).withMessage('Invalid semester'),
  query('status').optional().isIn(['draft', 'published', 'locked']).withMessage('Invalid status'),
];

export const gradebookIdRule = [
  param('id').isUUID().withMessage('Gradebook ID must be a valid UUID'),
];

export const courseIdRule = [
  param('courseId').isUUID().withMessage('Course ID must be a valid UUID'),
];

export const eligibleStudentsRules = [
  query('program')
    .isIn(['CSC', 'ICT', 'CRE'])
    .withMessage('program must be one of: CSC, ICT, CRE'),
  query('level')
    .isIn(Object.values(Level))
    .withMessage(`level must be one of: ${Object.values(Level).join(', ')}`),
];
