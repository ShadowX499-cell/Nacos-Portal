import { PrismaClient } from '@prisma/client';
import { GradebookService } from '../src/modules/gradebooks/gradebook.service';

describe('GradebookService.getEligibleStudents', () => {
  const mockDb = {
    gradebook: { findFirst: jest.fn() },
    course: { findFirst: jest.fn() },
    user: { findMany: jest.fn() },
    studentGrade: { findMany: jest.fn() },
  } as unknown as PrismaClient;

  const svc = new GradebookService(mockDb);

  beforeEach(() => jest.clearAllMocks());

  it('returns students matching program+level not yet graded', async () => {
    (mockDb.gradebook.findFirst as jest.Mock).mockResolvedValue({
      id: 'gb-1', level: 'L100', departmentId: 'dept-1',
    });
    (mockDb.course.findFirst as jest.Mock).mockResolvedValue({ id: 'c-1', gradebookId: 'gb-1' });
    (mockDb.studentGrade.findMany as jest.Mock).mockResolvedValue([
      { userId: 'already-graded' },
    ]);
    (mockDb.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'u-1', userId: 'NACOS/CSC/2024/001', name: 'Alice' },
      { id: 'u-2', userId: 'NACOS/CSC/2024/002', name: 'Bob' },
    ]);

    const result = await svc.getEligibleStudents('gb-1', 'c-1', 'CSC', 'L100', 'dept-1');

    expect(mockDb.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          program: 'CSC',
          level: 'L100',
          role: 'student',
          status: 'validated',
          id: { notIn: ['already-graded'] },
        }),
      })
    );
    expect(result).toEqual([
      { id: 'u-1', userId: 'NACOS/CSC/2024/001', name: 'Alice' },
      { id: 'u-2', userId: 'NACOS/CSC/2024/002', name: 'Bob' },
    ]);
  });

  it('throws 404 when gradebook not found', async () => {
    (mockDb.gradebook.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(svc.getEligibleStudents('bad', 'c-1', 'CSC', 'L100', 'dept-1'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 404 when course not found', async () => {
    (mockDb.gradebook.findFirst as jest.Mock).mockResolvedValue({ id: 'gb-1', level: 'L100', departmentId: 'dept-1' });
    (mockDb.course.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(svc.getEligibleStudents('gb-1', 'bad', 'CSC', 'L100', 'dept-1'))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});
