import { PrismaClient, GradebookStatus, UploadMethod, CsvJobStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import { sha256 } from '../../utils/jwt';
import { AppError } from '../../utils/response';
import type {
  CreateGradebookDto,
  CreateCourseDto,
  GradeEntryRow,
  GradebookPublic,
  CoursePublic,
  GradePublic,
  CsvJobPublic,
  GradebookSnapshot,
} from '../../types';

// ── Grading scale ─────────────────────────────────────────────────────────────

export function computeGrade(total: number): { grade: string; gradePoint: number } {
  if (total >= 70) return { grade: 'A', gradePoint: 5.0 };
  if (total >= 60) return { grade: 'B', gradePoint: 4.0 };
  if (total >= 50) return { grade: 'C', gradePoint: 3.0 };
  if (total >= 45) return { grade: 'D', gradePoint: 2.0 };
  if (total >= 40) return { grade: 'E', gradePoint: 1.0 };
  return { grade: 'F', gradePoint: 0.0 };
}

export class GradebookService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  // ── Gradebooks ───────────────────────────────────────────────────────────────

  async createGradebook(dto: CreateGradebookDto, actorId: string): Promise<GradebookPublic> {
    const existing = await this.db.gradebook.findFirst({
      where: {
        departmentId: dto.departmentId,
        ...(dto.program ? { program: dto.program as import('@prisma/client').Program } : {}),
        level: dto.level,
        session: dto.session,
        semester: dto.semester,
      },
    });
    if (existing) {
      throw new AppError(
        409,
        'CONFLICT',
        `A gradebook for ${dto.program ? dto.program + ' ' : ''}${dto.level} ${dto.session} ${dto.semester} semester already exists`
      );
    }

    const gradebook = await this.db.gradebook.create({
      data: {
        departmentId: dto.departmentId,
        name: dto.name,
        program: dto.program ? (dto.program as import('@prisma/client').Program) : null,
        level: dto.level,
        session: dto.session,
        semester: dto.semester,
        status: GradebookStatus.draft,
        createdById: actorId,
      },
    });

    return this.toPublicGradebook(gradebook);
  }

  async listGradebooks(
    departmentId: string,
    filters: { level?: string; session?: string; semester?: string; status?: string }
  ): Promise<GradebookPublic[]> {
    const where: Prisma.GradebookWhereInput = {
      departmentId,
      ...(filters.level ? { level: filters.level as import('@prisma/client').Level } : {}),
      ...(filters.session ? { session: filters.session } : {}),
      ...(filters.semester ? { semester: filters.semester as import('@prisma/client').Semester } : {}),
      ...(filters.status ? { status: filters.status as GradebookStatus } : {}),
    };

    const gradebooks = await this.db.gradebook.findMany({
      where,
      include: { courses: true },
      orderBy: { createdAt: 'desc' },
    });

    return gradebooks.map((gb) => ({
      ...this.toPublicGradebook(gb),
      courses: gb.courses.map((c) => this.toPublicCourse(c)),
    }));
  }

  async getGradebook(id: string, departmentId: string): Promise<GradebookPublic & { courses: CoursePublic[] }> {
    const gradebook = await this.db.gradebook.findFirst({
      where: { id, departmentId },
      include: {
        courses: true,
      },
    });
    if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Gradebook not found');

    const coursesWithCounts = await Promise.all(
      gradebook.courses.map(async (course) => {
        const gradeCount = await this.db.studentGrade.count({ where: { courseId: course.id } });
        return { ...this.toPublicCourse(course), gradeCount };
      })
    );

    return { ...this.toPublicGradebook(gradebook), courses: coursesWithCounts };
  }

  // ── Courses ──────────────────────────────────────────────────────────────────

  async addCourse(gradebookId: string, dto: CreateCourseDto, departmentId: string): Promise<CoursePublic> {
    const gradebook = await this.db.gradebook.findFirst({ where: { id: gradebookId, departmentId } });
    if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Gradebook not found');
    if (gradebook.status !== GradebookStatus.draft) {
      throw new AppError(400, 'GRADEBOOK_NOT_PUBLISHED', 'Cannot modify a published gradebook');
    }

    const existing = await this.db.course.findFirst({
      where: { gradebookId, courseCode: dto.courseCode },
    });
    if (existing) throw new AppError(409, 'CONFLICT', `Course ${dto.courseCode} already exists in this gradebook`);

    const course = await this.db.course.create({
      data: {
        gradebookId,
        courseCode: dto.courseCode,
        courseTitle: dto.courseTitle,
        creditUnits: dto.creditUnits,
        level: gradebook.level,
      },
    });

    return this.toPublicCourse(course);
  }

  async removeCourse(gradebookId: string, courseId: string, departmentId: string): Promise<void> {
    const gradebook = await this.db.gradebook.findFirst({ where: { id: gradebookId, departmentId } });
    if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Gradebook not found');
    if (gradebook.status !== GradebookStatus.draft) {
      throw new AppError(400, 'GRADEBOOK_NOT_PUBLISHED', 'Cannot modify a published gradebook');
    }

    const course = await this.db.course.findFirst({ where: { id: courseId, gradebookId } });
    if (!course) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Course not found');

    const gradeCount = await this.db.studentGrade.count({ where: { courseId } });
    if (gradeCount > 0) {
      throw new AppError(409, 'CONFLICT', 'Cannot remove a course that already has grades entered');
    }

    await this.db.course.delete({ where: { id: courseId } });
  }

  // ── Grades ───────────────────────────────────────────────────────────────────

  async getGrades(gradebookId: string, courseId: string, departmentId: string): Promise<GradePublic[]> {
    const gradebook = await this.db.gradebook.findFirst({ where: { id: gradebookId, departmentId } });
    if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Gradebook not found');

    const course = await this.db.course.findFirst({ where: { id: courseId, gradebookId } });
    if (!course) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Course not found');

    const grades = await this.db.studentGrade.findMany({
      where: { courseId },
      include: { student: true },
      orderBy: { student: { name: 'asc' } },
    });

    return grades.map((g) => ({
      id: g.id,
      courseId: g.courseId,
      userId: g.userId,
      studentName: g.student.name,
      studentUserId: g.student.userId,
      caScore: g.caScore ? Number(g.caScore) : null,
      examScore: g.examScore ? Number(g.examScore) : null,
      total: g.total ? Number(g.total) : null,
      grade: g.grade,
      gradePoint: g.gradePoint ? Number(g.gradePoint) : null,
    }));
  }

  async getCsvTemplate(gradebookId: string, courseId: string, departmentId: string): Promise<string> {
    const gradebook = await this.db.gradebook.findFirst({ where: { id: gradebookId, departmentId } });
    if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Gradebook not found');

    const course = await this.db.course.findFirst({ where: { id: courseId, gradebookId } });
    if (!course) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Course not found');

    // Existing grades — pre-fill their scores
    const existing = await this.db.studentGrade.findMany({
      where: { courseId },
      include: { student: true },
      orderBy: { student: { name: 'asc' } },
    });

    const rows: string[][] = [['student_id', 'ca_score', 'exam_score']];

    if (existing.length > 0) {
      for (const g of existing) {
        rows.push([
          g.student.userId,
          g.caScore ? String(Number(g.caScore)) : '',
          g.examScore ? String(Number(g.examScore)) : '',
        ]);
      }
    } else {
      // No grades yet — fetch eligible students by gradebook level
      const students = await this.db.user.findMany({
        where: { departmentId, level: gradebook.level, role: 'student', status: 'validated' },
        select: { userId: true, name: true },
        orderBy: { name: 'asc' },
      });
      for (const s of students) {
        rows.push([s.userId, '', '']);
      }
    }

    return rows.map((r) => r.join(',')).join('\n');
  }

  async exportResultsCsv(gradebookId: string, departmentId: string): Promise<string> {
    const gradebook = await this.db.gradebook.findFirst({
      where: { id: gradebookId, departmentId },
      include: { courses: { orderBy: { createdAt: 'asc' } } },
    });
    if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Gradebook not found');

    const grades = await this.db.studentGrade.findMany({
      where: { course: { gradebookId } },
      include: { student: true, course: true },
      orderBy: [{ student: { name: 'asc' } }, { course: { courseCode: 'asc' } }],
    });

    // Group by student
    const studentMap = new Map<string, {
      userId: string; name: string; program: string; level: string;
      courses: Record<string, { ca: number | null; exam: number | null; total: number | null; grade: string | null }>;
    }>();

    for (const g of grades) {
      if (!studentMap.has(g.userId)) {
        studentMap.set(g.userId, {
          userId: g.student.userId,
          name: g.student.name,
          program: g.student.program,
          level: g.student.level,
          courses: {},
        });
      }
      studentMap.get(g.userId)!.courses[g.courseId] = {
        ca: g.caScore ? Number(g.caScore) : null,
        exam: g.examScore ? Number(g.examScore) : null,
        total: g.total ? Number(g.total) : null,
        grade: g.grade,
      };
    }

    const courses = gradebook.courses;

    // CSV header
    const headers = [
      'Student ID', 'Name', 'Program', 'Level',
      ...courses.flatMap((c) => [`${c.courseCode} CA`, `${c.courseCode} Exam`, `${c.courseCode} Total`, `${c.courseCode} Grade`]),
      'Overall Total', 'GPA',
    ];

    const rows: string[][] = [headers];

    for (const s of studentMap.values()) {
      let overallTotal = 0;
      let gradePoints = 0;
      let totalUnits = 0;
      const courseFields: string[] = [];

      for (const c of courses) {
        const g = s.courses[c.id];
        const ca    = g?.ca    ?? '';
        const exam  = g?.exam  ?? '';
        const total = g?.total ?? '';
        const grade = g?.grade ?? '';

        if (g?.total !== null && g?.total !== undefined) {
          overallTotal += g.total;
          const { gradePoint } = computeGrade(g.total);
          gradePoints  += gradePoint * c.creditUnits;
          totalUnits   += c.creditUnits;
        }

        courseFields.push(String(ca), String(exam), String(total), String(grade));
      }

      const gpa = totalUnits > 0 ? (gradePoints / totalUnits).toFixed(2) : '';

      rows.push([
        s.userId, s.name, s.program, s.level.replace('L', '') + ' Level',
        ...courseFields,
        overallTotal > 0 ? String(overallTotal) : '',
        gpa,
      ]);
    }

    return rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  async getEligibleStudents(
    gradebookId: string,
    courseId: string,
    program: string,
    level: string,
    departmentId: string
  ): Promise<{ id: string; userId: string; name: string }[]> {
    const gradebook = await this.db.gradebook.findFirst({ where: { id: gradebookId, departmentId } });
    if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Gradebook not found');

    const course = await this.db.course.findFirst({ where: { id: courseId, gradebookId } });
    if (!course) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Course not found');

    const alreadyGraded = await this.db.studentGrade.findMany({
      where: { courseId },
      select: { userId: true },
    });
    const excludeIds = alreadyGraded.map((g) => g.userId);

    // If the gradebook is program-specific, use its program; otherwise use the caller's filter
    const effectiveProgram = (gradebook as { program?: string | null }).program ?? program;

    return this.db.user.findMany({
      where: {
        departmentId,
        program: effectiveProgram as import('@prisma/client').Program,
        level: level as import('@prisma/client').Level,
        role: 'student',
        status: 'validated',
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      },
      select: { id: true, userId: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async upsertGrades(
    gradebookId: string,
    courseId: string,
    entries: GradeEntryRow[],
    actorId: string,
    departmentId: string
  ): Promise<void> {
    const gradebook = await this.db.gradebook.findFirst({ where: { id: gradebookId, departmentId } });
    if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Gradebook not found');
    if (gradebook.status !== GradebookStatus.draft) {
      throw new AppError(400, 'GRADEBOOK_NOT_PUBLISHED', 'Cannot modify grades on a published gradebook');
    }

    const course = await this.db.course.findFirst({ where: { id: courseId, gradebookId } });
    if (!course) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Course not found');

    await this.db.$transaction(
      entries.map((entry) => {
        const caScore = entry.caScore ?? null;
        const examScore = entry.examScore ?? null;
        const total = caScore !== null && examScore !== null ? caScore + examScore : null;
        const { grade, gradePoint } = total !== null ? computeGrade(total) : { grade: null, gradePoint: null };

        return this.db.studentGrade.upsert({
          where: { courseId_userId: { courseId, userId: entry.userId } },
          create: {
            courseId,
            userId: entry.userId,
            caScore: caScore !== null ? new Prisma.Decimal(caScore) : null,
            examScore: examScore !== null ? new Prisma.Decimal(examScore) : null,
            total: total !== null ? new Prisma.Decimal(total) : null,
            grade,
            gradePoint: gradePoint !== null ? new Prisma.Decimal(gradePoint) : null,
            uploadMethod: UploadMethod.manual,
            enteredById: actorId,
          },
          update: {
            caScore: caScore !== null ? new Prisma.Decimal(caScore) : null,
            examScore: examScore !== null ? new Prisma.Decimal(examScore) : null,
            total: total !== null ? new Prisma.Decimal(total) : null,
            grade,
            gradePoint: gradePoint !== null ? new Prisma.Decimal(gradePoint) : null,
            lastModifiedById: actorId,
            lastModifiedAt: new Date(),
          },
        });
      })
    );
  }

  // ── Publish ──────────────────────────────────────────────────────────────────

  async publishGradebook(id: string, actorId: string, departmentId: string): Promise<GradebookPublic> {
    const gradebook = await this.db.gradebook.findFirst({
      where: { id, departmentId },
      include: { courses: true },
    });
    if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Gradebook not found');
    if (gradebook.status !== GradebookStatus.draft) {
      throw new AppError(409, 'CONFLICT', 'Gradebook is already published');
    }
    if (gradebook.courses.length === 0) {
      throw new AppError(400, 'GRADEBOOK_INCOMPLETE', 'Add at least one course before publishing');
    }

    // All courses must have at least one grade
    const gradeCounts = await Promise.all(
      gradebook.courses.map((c) => this.db.studentGrade.count({ where: { courseId: c.id } }))
    );
    if (gradeCounts.some((count) => count === 0)) {
      throw new AppError(
        400,
        'GRADEBOOK_INCOMPLETE',
        'All courses must have grades entered before publishing'
      );
    }

    // Build snapshot
    const snapshot = await this.buildSnapshot(gradebook, gradebook.courses);
    const snapshotJson = JSON.stringify(snapshot);
    const checksum = sha256(snapshotJson);

    const [updated] = await this.db.$transaction([
      this.db.gradebook.update({
        where: { id },
        data: { status: GradebookStatus.published, publishedAt: new Date(), publishedById: actorId },
      }),
      this.db.resultSnapshot.create({
        data: {
          gradebookId: id,
          snapshotJson: snapshot as unknown as Prisma.InputJsonValue,
          checksum,
          publishedById: actorId,
        },
      }),
      this.db.auditLog.create({
        data: {
          actorId,
          action: 'RESULT_PUBLISHED',
          entityType: 'gradebook',
          entityId: id,
        },
      }),
    ]);

    // ── Carryover computation (post-publish, fire-and-forget) ─────────────────
    this.computeCarryovers(id, gradebook.session).catch((e) =>
      console.error('[GradebookService] Carryover computation failed:', e)
    );

    return this.toPublicGradebook(updated);
  }

  private async computeCarryovers(gradebookId: string, session: string): Promise<void> {
    const allGrades = await this.db.studentGrade.findMany({
      where: { course: { gradebookId } },
      select: { id: true, userId: true, grade: true, isCarryover: true, resolvedAt: true },
    });

    const nowFailed = allGrades.filter((g) => g.grade === 'F' && !g.isCarryover);
    const nowPassed = allGrades.filter((g) => g.grade !== 'F' && g.grade !== null && g.isCarryover && !g.resolvedAt);

    // Mark newly failed grades as carryover
    if (nowFailed.length > 0) {
      await this.db.studentGrade.updateMany({
        where: { id: { in: nowFailed.map((g) => g.id) } },
        data: { isCarryover: true, carriedFromSession: session },
      });
    }

    // Resolve previously failed grades that are now passing
    if (nowPassed.length > 0) {
      await this.db.studentGrade.updateMany({
        where: { id: { in: nowPassed.map((g) => g.id) } },
        data: { resolvedAt: new Date() },
      });
    }

    // Collect affected student IDs
    const affectedStudentIds = [
      ...new Set([...nowFailed.map((g) => g.userId), ...nowPassed.map((g) => g.userId)]),
    ];

    // Update studentStatus for affected students
    for (const userId of affectedStudentIds) {
      const unresolvedCount = await this.db.studentGrade.count({
        where: { userId, isCarryover: true, resolvedAt: null },
      });
      await this.db.user.update({
        where: { id: userId },
        data: { studentStatus: unresolvedCount > 0 ? 'carryover' : 'active' },
      });
    }
  }

  // ── CSV Jobs ─────────────────────────────────────────────────────────────────

  async createCsvJob(
    gradebookId: string,
    courseId: string,
    uploadedById: string,
    departmentId: string
  ): Promise<CsvJobPublic> {
    const gradebook = await this.db.gradebook.findFirst({ where: { id: gradebookId, departmentId } });
    if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Gradebook not found');
    if (gradebook.status !== GradebookStatus.draft) {
      throw new AppError(400, 'GRADEBOOK_NOT_PUBLISHED', 'Cannot upload CSV to a published gradebook');
    }

    const course = await this.db.course.findFirst({ where: { id: courseId, gradebookId } });
    if (!course) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Course not found');

    const job = await this.db.csvUploadJob.create({
      data: { gradebookId, courseId, uploadedById, status: CsvJobStatus.pending },
    });

    return this.toPublicCsvJob(job);
  }

  async updateCsvJob(
    jobId: string,
    updates: {
      status?: CsvJobStatus;
      totalRows?: number;
      processedRows?: number;
      errorLog?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
      completedAt?: Date;
    }
  ): Promise<void> {
    await this.db.csvUploadJob.update({ where: { id: jobId }, data: updates });
  }

  async listCsvJobs(gradebookId: string, departmentId: string): Promise<CsvJobPublic[]> {
    const gradebook = await this.db.gradebook.findFirst({ where: { id: gradebookId, departmentId } });
    if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Gradebook not found');

    const jobs = await this.db.csvUploadJob.findMany({
      where: { gradebookId },
      orderBy: { createdAt: 'desc' },
    });

    return jobs.map(this.toPublicCsvJob);
  }

  async getCsvJob(jobId: string, gradebookId: string, departmentId: string): Promise<CsvJobPublic> {
    const gradebook = await this.db.gradebook.findFirst({ where: { id: gradebookId, departmentId } });
    if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Gradebook not found');

    const job = await this.db.csvUploadJob.findFirst({ where: { id: jobId, gradebookId } });
    if (!job) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'CSV job not found');

    return this.toPublicCsvJob(job);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async buildSnapshot(
    gradebook: { id: string; name: string; level: string; session: string; semester: string; publishedAt: Date | null },
    courses: Array<{ id: string; courseCode: string; courseTitle: string; creditUnits: number }>
  ): Promise<GradebookSnapshot> {
    const allGrades = await this.db.studentGrade.findMany({
      where: { courseId: { in: courses.map((c) => c.id) } },
      include: { student: { select: { id: true, userId: true, name: true } } },
    });

    const gradesMap: GradebookSnapshot['grades'] = {};
    const studentsMap: GradebookSnapshot['students'] = {};

    for (const g of allGrades) {
      if (!gradesMap[g.userId]) gradesMap[g.userId] = {};
      gradesMap[g.userId][g.courseId] = {
        caScore: g.caScore ? Number(g.caScore) : null,
        examScore: g.examScore ? Number(g.examScore) : null,
        total: g.total ? Number(g.total) : null,
        grade: g.grade,
        gradePoint: g.gradePoint ? Number(g.gradePoint) : null,
      };
      studentsMap[g.userId] = { userId: g.student.userId, name: g.student.name };
    }

    return {
      gradebookId: gradebook.id,
      gradebookName: gradebook.name,
      level: gradebook.level,
      session: gradebook.session,
      semester: gradebook.semester,
      publishedAt: (gradebook.publishedAt ?? new Date()).toISOString(),
      courses: courses.map((c) => ({
        courseId: c.id,
        courseCode: c.courseCode,
        courseTitle: c.courseTitle,
        creditUnits: c.creditUnits,
      })),
      grades: gradesMap,
      students: studentsMap,
    };
  }

  private toPublicGradebook(gb: {
    id: string;
    name: string;
    program?: import('@prisma/client').Program | null;
    level: import('@prisma/client').Level;
    session: string;
    semester: import('@prisma/client').Semester;
    status: GradebookStatus;
    departmentId: string;
    publishedAt: Date | null;
    createdAt: Date;
  }): GradebookPublic {
    return {
      id: gb.id,
      name: gb.name,
      program: gb.program ?? null,
      level: gb.level,
      session: gb.session,
      semester: gb.semester,
      status: gb.status,
      departmentId: gb.departmentId,
      publishedAt: gb.publishedAt,
      createdAt: gb.createdAt,
    };
  }

  private toPublicCourse(c: {
    id: string;
    gradebookId: string;
    courseCode: string;
    courseTitle: string;
    creditUnits: number;
  }): CoursePublic {
    return {
      id: c.id,
      gradebookId: c.gradebookId,
      courseCode: c.courseCode,
      courseTitle: c.courseTitle,
      creditUnits: c.creditUnits,
    };
  }

  private toPublicCsvJob(job: {
    id: string;
    gradebookId: string;
    courseId: string;
    status: CsvJobStatus;
    totalRows: number | null;
    processedRows: number;
    errorLog: unknown;
    createdAt: Date;
    completedAt: Date | null;
  }): CsvJobPublic {
    return {
      id: job.id,
      gradebookId: job.gradebookId,
      courseId: job.courseId,
      status: job.status,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      errorLog: job.errorLog as import('../../types').CsvRowError[] | null,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }
}

export const gradebookService = new GradebookService();
