import { parse } from 'csv-parse/sync';
import { PrismaClient, UploadMethod, CsvJobStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import { computeGrade } from './gradebook.service';
import type { CsvRowError } from '../../types';

interface CsvRow {
  student_id: string;
  ca_score: string;
  exam_score: string;
}

const REQUIRED_HEADERS = ['student_id', 'ca_score', 'exam_score'];

export async function processCsvJob(
  jobId: string,
  courseId: string,
  gradebookDepartmentId: string,
  buffer: Buffer,
  actorId: string,
  db: PrismaClient = defaultPrisma
): Promise<void> {
  try {
    // Parse CSV
    let rows: CsvRow[];
    try {
      rows = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as CsvRow[];
    } catch {
      await db.csvUploadJob.update({
        where: { id: jobId },
        data: { status: CsvJobStatus.failed, completedAt: new Date() },
      });
      return;
    }

    // Validate headers
    if (rows.length === 0 || !REQUIRED_HEADERS.every((h) => h in (rows[0] ?? {}))) {
      await db.csvUploadJob.update({
        where: { id: jobId },
        data: {
          status: CsvJobStatus.failed,
          errorLog: [{ row: 0, field: 'headers', message: `CSV must have columns: ${REQUIRED_HEADERS.join(', ')}` }] as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
      return;
    }

    await db.csvUploadJob.update({
      where: { id: jobId },
      data: { status: CsvJobStatus.processing, totalRows: rows.length },
    });

    const errors: CsvRowError[] = [];
    let processedRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header row

      // Find student by userId within the department
      const student = await db.user.findFirst({
        where: { userId: row.student_id, departmentId: gradebookDepartmentId },
      });

      if (!student) {
        errors.push({ row: rowNum, field: 'student_id', message: `Student "${row.student_id}" not found in department` });
        continue;
      }

      const caScore = parseFloat(row.ca_score);
      const examScore = parseFloat(row.exam_score);

      if (isNaN(caScore) || caScore < 0 || caScore > 30) {
        errors.push({ row: rowNum, field: 'ca_score', message: `ca_score must be a number between 0 and 30` });
        continue;
      }

      if (isNaN(examScore) || examScore < 0 || examScore > 70) {
        errors.push({ row: rowNum, field: 'exam_score', message: `exam_score must be a number between 0 and 70` });
        continue;
      }

      const total = caScore + examScore;
      const { grade, gradePoint } = computeGrade(total);

      await db.studentGrade.upsert({
        where: { courseId_userId: { courseId, userId: student.id } },
        create: {
          courseId,
          userId: student.id,
          caScore: new Prisma.Decimal(caScore),
          examScore: new Prisma.Decimal(examScore),
          total: new Prisma.Decimal(total),
          grade,
          gradePoint: new Prisma.Decimal(gradePoint),
          uploadMethod: UploadMethod.csv,
          enteredById: actorId,
        },
        update: {
          caScore: new Prisma.Decimal(caScore),
          examScore: new Prisma.Decimal(examScore),
          total: new Prisma.Decimal(total),
          grade,
          gradePoint: new Prisma.Decimal(gradePoint),
          lastModifiedById: actorId,
          lastModifiedAt: new Date(),
        },
      });

      processedRows++;

      // Persist progress every 10 rows
      if (processedRows % 10 === 0) {
        await db.csvUploadJob.update({ where: { id: jobId }, data: { processedRows } });
      }
    }

    await db.csvUploadJob.update({
      where: { id: jobId },
      data: {
        status: CsvJobStatus.completed,
        processedRows,
        errorLog: errors.length > 0 ? (errors as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    await db.csvUploadJob.update({
      where: { id: jobId },
      data: {
        status: CsvJobStatus.failed,
        errorLog: [{ row: 0, field: 'system', message: String(err) }] as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    }).catch(() => undefined);
  }
}
