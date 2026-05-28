import { Request, Response } from 'express';
import multer from 'multer';
import { gradebookService } from './gradebook.service';
import { processCsvJob } from './csv-processor';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest, CreateGradebookDto, CreateCourseDto, GradeEntryRow } from '../../types';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

/** POST /api/v1/gradebooks */
export const createGradebook = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const dto: CreateGradebookDto = { ...(req.body as Omit<CreateGradebookDto, 'departmentId'>), departmentId };
  const gradebook = await gradebookService.createGradebook(dto, sub);
  sendSuccess(res, gradebook, 'Gradebook created', 201);
});

/** GET /api/v1/gradebooks */
export const listGradebooks = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const { level, session, semester, status } = req.query as Record<string, string>;
  const gradebooks = await gradebookService.listGradebooks(departmentId, { level, session, semester, status });
  sendSuccess(res, gradebooks, 'Gradebooks retrieved');
});

/** GET /api/v1/gradebooks/:id */
export const getGradebook = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const gradebook = await gradebookService.getGradebook(req.params.id, departmentId);
  sendSuccess(res, gradebook, 'Gradebook retrieved');
});

/** POST /api/v1/gradebooks/:id/courses */
export const addCourse = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const course = await gradebookService.addCourse(req.params.id, req.body as CreateCourseDto, departmentId);
  sendSuccess(res, course, 'Course added', 201);
});

/** DELETE /api/v1/gradebooks/:id/courses/:courseId */
export const removeCourse = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  await gradebookService.removeCourse(req.params.id, req.params.courseId, departmentId);
  sendSuccess(res, null, 'Course removed');
});

/** GET /api/v1/gradebooks/:id/courses/:courseId/grades */
export const getGrades = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const grades = await gradebookService.getGrades(req.params.id, req.params.courseId, departmentId);
  sendSuccess(res, grades, 'Grades retrieved');
});

/** PUT /api/v1/gradebooks/:id/courses/:courseId/grades */
export const upsertGrades = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const { grades } = req.body as { grades: GradeEntryRow[] };
  await gradebookService.upsertGrades(req.params.id, req.params.courseId, grades, sub, departmentId);
  sendSuccess(res, null, 'Grades saved');
});

/** POST /api/v1/gradebooks/:id/courses/:courseId/csv */
export const uploadGradeCsv = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;

  if (!req.file) {
    res.status(400).json({ success: false, error: { code: 'CSV_MISSING', message: 'No CSV file uploaded' } });
    return;
  }

  const job = await gradebookService.createCsvJob(req.params.id, req.params.courseId, sub, departmentId);

  // Kick off async processing — do not await
  setImmediate(() => {
    void processCsvJob(
      job.id,
      req.params.courseId,
      departmentId,
      req.file!.buffer,
      sub
    );
  });

  sendSuccess(res, { jobId: job.id }, 'CSV upload started', 202);
});

/** GET /api/v1/gradebooks/:id/csv-jobs */
export const listCsvJobs = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const jobs = await gradebookService.listCsvJobs(req.params.id, departmentId);
  sendSuccess(res, jobs, 'CSV jobs retrieved');
});

/** GET /api/v1/gradebooks/:id/csv-jobs/:jobId */
export const getCsvJob = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const job = await gradebookService.getCsvJob(req.params.jobId, req.params.id, departmentId);
  sendSuccess(res, job, 'CSV job retrieved');
});

/** POST /api/v1/gradebooks/:id/publish */
export const publishGradebook = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const gradebook = await gradebookService.publishGradebook(req.params.id, sub, departmentId);
  sendSuccess(res, gradebook, 'Gradebook published');
});
