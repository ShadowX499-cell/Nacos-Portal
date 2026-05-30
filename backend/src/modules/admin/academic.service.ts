import { PrismaClient, Semester, StudentStatus, Level } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import { AppError } from '../../utils/response';
import type { AcademicAdvancePreview, AcademicTransitionPublic } from '../../types';

const LEVEL_PROGRESSION: Record<Level, Level | null> = {
  L100: Level.L200,
  L200: Level.L300,
  L300: Level.L400,
  L400: null, // graduates
};

function nextSemester(current: Semester): { semester: Semester; advancedSession: boolean } {
  if (current === Semester.first) return { semester: Semester.second, advancedSession: false };
  return { semester: Semester.first, advancedSession: true };
}

function nextSessionYear(session: string): string {
  const [start, end] = session.split('/').map(Number);
  return `${start + 1}/${end + 1}`;
}

export class AcademicService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async preview(departmentId: string): Promise<AcademicAdvancePreview> {
    const dept = await this.db.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Department not found');

    const currentSession = dept.currentSession ?? `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
    const currentSemester = dept.currentSemester ?? Semester.first;
    const { semester: toSemester, advancedSession } = nextSemester(currentSemester);
    const toSession = advancedSession ? nextSessionYear(currentSession) : currentSession;

    const [studentsToAdvance, studentsToGraduate, unpublishedGradebooks] = await Promise.all([
      this.db.user.count({
        where: { departmentId, role: 'student', studentStatus: { in: ['active', 'carryover'] }, level: { not: Level.L400 } },
      }),
      this.db.user.count({
        where: { departmentId, role: 'student', studentStatus: { in: ['active', 'carryover'] }, level: Level.L400 },
      }),
      this.db.gradebook.count({
        where: { departmentId, session: currentSession, semester: currentSemester, status: 'draft' },
      }),
    ]);

    return {
      currentSession,
      currentSemester,
      targetSession: toSession,
      targetSemester: toSemester,
      type: advancedSession ? 'session' : 'semester',
      studentsToAdvance: advancedSession ? studentsToAdvance : 0,
      studentsToGraduate: advancedSession ? studentsToGraduate : 0,
      unpublishedGradebooks,
    };
  }

  async advance(
    departmentId: string,
    type: 'semester' | 'session',
    confirm: boolean,
    force: boolean,
    actorId: string
  ): Promise<AcademicTransitionPublic> {
    if (!confirm) throw new AppError(400, 'VALIDATION_ERROR', 'confirm must be true to advance');

    const dept = await this.db.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Department not found');

    const currentSession = dept.currentSession ?? `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
    const currentSemester = dept.currentSemester ?? Semester.first;
    const { semester: toSemester, advancedSession } = nextSemester(currentSemester);
    const toSession = advancedSession ? nextSessionYear(currentSession) : currentSession;

    // Double-advance guard
    const existing = await this.db.academicTransition.findFirst({
      where: { departmentId, toSession, toSemester },
    });
    if (existing) throw new AppError(409, 'ALREADY_ADVANCED', 'This semester/session has already been advanced');

    // Warn about unpublished gradebooks
    const unpublished = await this.db.gradebook.count({
      where: { departmentId, session: currentSession, semester: currentSemester, status: 'draft' },
    });
    if (unpublished > 0 && !force) {
      throw new AppError(
        409,
        'UNPUBLISHED_GRADEBOOKS',
        `${unpublished} gradebook(s) are still in draft. Pass force=true to advance anyway.`
      );
    }

    let studentsAdvanced = 0;
    let studentsGraduated = 0;

    if (advancedSession) {
      // Advance all active/carryover students
      const students = await this.db.user.findMany({
        where: { departmentId, role: 'student', studentStatus: { in: ['active', 'carryover'] } },
        select: { id: true, level: true },
      });

      for (const student of students) {
        const nextLevel = LEVEL_PROGRESSION[student.level];
        if (nextLevel === null) {
          // L400 → graduate
          await this.db.user.update({
            where: { id: student.id },
            data: { studentStatus: StudentStatus.graduated },
          });
          studentsGraduated++;
        } else {
          await this.db.user.update({
            where: { id: student.id },
            data: { level: nextLevel },
          });
          studentsAdvanced++;
        }
      }
    }

    // Update department calendar
    await this.db.department.update({
      where: { id: departmentId },
      data: { currentSession: toSession, currentSemester: toSemester },
    });

    // Record transition
    const transition = await this.db.academicTransition.create({
      data: {
        departmentId,
        fromSession: currentSession,
        fromSemester: currentSemester,
        toSession,
        toSemester,
        studentsAdvanced,
        studentsGraduated,
        initiatedById: actorId,
      },
      include: { initiatedBy: { select: { name: true } } },
    });

    // Audit log
    this.db.auditLog.create({
      data: {
        actorId,
        action: 'SESSION_ADVANCED',
        entityType: 'department',
        entityId: departmentId,
        newValue: {
          from: `${currentSession} ${currentSemester}`,
          to: `${toSession} ${toSemester}`,
          studentsAdvanced,
          studentsGraduated,
        } as Prisma.InputJsonValue,
      },
    }).catch(() => {});

    return {
      id: transition.id,
      fromSession: transition.fromSession,
      fromSemester: transition.fromSemester,
      toSession: transition.toSession,
      toSemester: transition.toSemester,
      studentsAdvanced: transition.studentsAdvanced,
      studentsGraduated: transition.studentsGraduated,
      initiatedAt: transition.initiatedAt,
      initiatedByName: transition.initiatedBy.name,
    };
  }

  async listTransitions(departmentId: string): Promise<AcademicTransitionPublic[]> {
    const list = await this.db.academicTransition.findMany({
      where: { departmentId },
      orderBy: { initiatedAt: 'desc' },
      include: { initiatedBy: { select: { name: true } } },
    });
    return list.map((t) => ({
      id: t.id,
      fromSession: t.fromSession,
      fromSemester: t.fromSemester,
      toSession: t.toSession,
      toSemester: t.toSemester,
      studentsAdvanced: t.studentsAdvanced,
      studentsGraduated: t.studentsGraduated,
      initiatedAt: t.initiatedAt,
      initiatedByName: t.initiatedBy.name,
    }));
  }
}

export const academicService = new AcademicService();
