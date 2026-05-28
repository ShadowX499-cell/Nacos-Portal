import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import { AppError } from '../../utils/response';
import type {
  ResultListItem,
  StudentResultView,
  GpaSummary,
  GradebookSnapshot,
} from '../../types';

export class ResultsService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async listResults(studentId: string, departmentId: string, level: string): Promise<ResultListItem[]> {
    const gradebooks = await this.db.gradebook.findMany({
      where: { departmentId, level: level as import('@prisma/client').Level, status: 'published' },
      orderBy: [{ session: 'desc' }, { semester: 'asc' }],
    });

    const paidSet = await this.getPaidSet(studentId);

    return gradebooks.map((gb) => ({
      gradebookId: gb.id,
      gradebookName: gb.name,
      level: gb.level,
      session: gb.session,
      semester: gb.semester,
      publishedAt: gb.publishedAt!.toISOString(),
      hasPaid: paidSet.has(`${gb.session}:${gb.semester}`),
    }));
  }

  async getResult(gradebookId: string, studentId: string, departmentId: string): Promise<StudentResultView> {
    const gradebook = await this.db.gradebook.findFirst({
      where: { id: gradebookId, departmentId, status: 'published' },
    });
    if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Result not found or not yet published');

    // Payment gate
    const payment = await this.db.payment.findFirst({
      where: {
        userId: studentId,
        type: 'result_subscription',
        status: 'success',
        sessionYear: gradebook.session,
        semester: gradebook.semester,
      },
    });
    if (!payment) {
      throw new AppError(402, 'PAYMENT_REQUIRED', 'Please subscribe to view this result');
    }

    // Fetch snapshot
    const snapshot = await this.db.resultSnapshot.findFirst({
      where: { gradebookId },
      orderBy: { publishedAt: 'desc' },
    });
    if (!snapshot) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Result snapshot not found');

    const data = snapshot.snapshotJson as unknown as GradebookSnapshot;
    return this.buildStudentView(studentId, data);
  }

  async getGpa(studentId: string, departmentId: string, level: string): Promise<GpaSummary> {
    // All published gradebooks for the student's level that they've paid for
    const paidSet = await this.getPaidSet(studentId);

    const gradebooks = await this.db.gradebook.findMany({
      where: { departmentId, level: level as import('@prisma/client').Level, status: 'published' },
    });

    const paidGradebooks = gradebooks.filter((gb) => paidSet.has(`${gb.session}:${gb.semester}`));

    if (paidGradebooks.length === 0) {
      return { semesters: [], cgpa: 0, totalCreditsEarned: 0 };
    }

    const snapshots = await this.db.resultSnapshot.findMany({
      where: { gradebookId: { in: paidGradebooks.map((g) => g.id) } },
    });

    const snapshotByGradebook = new Map(snapshots.map((s) => [s.gradebookId, s]));

    let totalWeightedPoints = 0;
    let totalCredits = 0;
    const semesters: GpaSummary['semesters'] = [];

    for (const gb of paidGradebooks) {
      const snapshot = snapshotByGradebook.get(gb.id);
      if (!snapshot) continue;

      const data = snapshot.snapshotJson as unknown as GradebookSnapshot;
      const view = this.buildStudentView(studentId, data);

      totalWeightedPoints += view.sgpa * view.totalCredits;
      totalCredits += view.totalCredits;

      semesters.push({
        gradebookId: gb.id,
        gradebookName: gb.name,
        session: gb.session,
        semester: gb.semester,
        sgpa: view.sgpa,
        totalCredits: view.totalCredits,
      });
    }

    const cgpa = totalCredits > 0 ? Math.round((totalWeightedPoints / totalCredits) * 100) / 100 : 0;

    return { semesters, cgpa, totalCreditsEarned: totalCredits };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private buildStudentView(studentId: string, data: GradebookSnapshot): StudentResultView {
    const studentGrades = data.grades[studentId] ?? {};

    let weightedPoints = 0;
    let totalCredits = 0;

    const courses = data.courses.map((course) => {
      const grade = studentGrades[course.courseId] ?? {
        caScore: null,
        examScore: null,
        total: null,
        grade: null,
        gradePoint: null,
      };

      if (grade.gradePoint !== null) {
        weightedPoints += grade.gradePoint * course.creditUnits;
        totalCredits += course.creditUnits;
      }

      return {
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        creditUnits: course.creditUnits,
        caScore: grade.caScore,
        examScore: grade.examScore,
        total: grade.total,
        grade: grade.grade,
        gradePoint: grade.gradePoint,
      };
    });

    const sgpa = totalCredits > 0 ? Math.round((weightedPoints / totalCredits) * 100) / 100 : 0;

    return {
      gradebookId: data.gradebookId,
      gradebookName: data.gradebookName,
      level: data.level,
      session: data.session,
      semester: data.semester,
      publishedAt: data.publishedAt,
      courses,
      sgpa,
      totalCredits,
    };
  }

  private async getPaidSet(studentId: string): Promise<Set<string>> {
    const payments = await this.db.payment.findMany({
      where: { userId: studentId, type: 'result_subscription', status: 'success' },
      select: { sessionYear: true, semester: true },
    });
    return new Set(payments.map((p) => `${p.sessionYear}:${p.semester}`));
  }
}

export const resultsService = new ResultsService();
