import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { apiRateLimit } from '../../middleware/rate-limit.middleware';
import {
  createGradebookRules,
  addCourseRules,
  upsertGradesRules,
  listGradebooksRules,
  gradebookIdRule,
  courseIdRule,
  eligibleStudentsRules,
} from './gradebook.validation';
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

const router = Router();

router.use(authenticate, requireAdmin, apiRateLimit);

/** POST   /api/v1/gradebooks */
router.post('/', validate(createGradebookRules), createGradebook);

/** GET    /api/v1/gradebooks */
router.get('/', validate(listGradebooksRules), listGradebooks);

/** GET    /api/v1/gradebooks/:id */
router.get('/:id', validate(gradebookIdRule), getGradebook);

/** POST   /api/v1/gradebooks/:id/publish */
router.post('/:id/publish', validate(gradebookIdRule), publishGradebook);

/** POST   /api/v1/gradebooks/:id/courses */
router.post('/:id/courses', validate([...gradebookIdRule, ...addCourseRules]), addCourse);

/** DELETE /api/v1/gradebooks/:id/courses/:courseId */
router.delete('/:id/courses/:courseId', validate([...gradebookIdRule, ...courseIdRule]), removeCourse);

/** GET    /api/v1/gradebooks/:id/courses/:courseId/grades */
router.get('/:id/courses/:courseId/grades', validate([...gradebookIdRule, ...courseIdRule]), getGrades);

/** GET    /api/v1/gradebooks/:id/courses/:courseId/eligible-students */
router.get(
  '/:id/courses/:courseId/eligible-students',
  validate([...gradebookIdRule, ...courseIdRule, ...eligibleStudentsRules]),
  getEligibleStudents
);

/** PUT    /api/v1/gradebooks/:id/courses/:courseId/grades */
router.put('/:id/courses/:courseId/grades', validate([...gradebookIdRule, ...courseIdRule, ...upsertGradesRules]), upsertGrades);

/** POST   /api/v1/gradebooks/:id/courses/:courseId/csv */
router.post('/:id/courses/:courseId/csv', validate([...gradebookIdRule, ...courseIdRule]), upload.single('file'), uploadGradeCsv);

/** GET    /api/v1/gradebooks/:id/csv-jobs */
router.get('/:id/csv-jobs', validate(gradebookIdRule), listCsvJobs);

/** GET    /api/v1/gradebooks/:id/csv-jobs/:jobId */
router.get('/:id/csv-jobs/:jobId', validate(gradebookIdRule), getCsvJob);

export default router;
