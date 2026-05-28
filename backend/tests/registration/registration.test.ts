import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegistrationService } from '../../src/modules/registration/registration.service';
import { AppError } from '../../src/utils/response';
import { RegistrationStatus, Semester } from '@prisma/client';

const mockReg = {
  id: 'reg-1', userId: 'user-1', session: '2024/2025',
  semester: Semester.first, fileUrl: 'https://s3.url/file.pdf',
  status: RegistrationStatus.pending, reviewedById: null, reviewNote: null,
  submittedAt: new Date(), reviewedAt: null,
};

const prismaMock = {
  courseRegistration: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

let service: RegistrationService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new RegistrationService(prismaMock as unknown as import('@prisma/client').PrismaClient);
});

describe('RegistrationService.submitRegistration', () => {
  it('creates a new registration when none exists', async () => {
    prismaMock.courseRegistration.findUnique.mockResolvedValue(null);
    prismaMock.courseRegistration.create.mockResolvedValue(mockReg);

    const result = await service.submitRegistration('user-1', '2024/2025', 'first', 'https://s3.url/file.pdf');
    expect(prismaMock.courseRegistration.create).toHaveBeenCalled();
    expect(result.status).toBe('pending');
  });

  it('updates an existing pending registration (re-upload)', async () => {
    prismaMock.courseRegistration.findUnique.mockResolvedValue(mockReg);
    prismaMock.courseRegistration.update.mockResolvedValue({ ...mockReg, fileUrl: 'https://new.url/file.pdf' });

    const result = await service.submitRegistration('user-1', '2024/2025', 'first', 'https://new.url/file.pdf');
    expect(prismaMock.courseRegistration.update).toHaveBeenCalled();
    expect(prismaMock.courseRegistration.create).not.toHaveBeenCalled();
  });

  it('throws 409 when replacing a verified registration', async () => {
    prismaMock.courseRegistration.findUnique.mockResolvedValue({ ...mockReg, status: RegistrationStatus.verified });
    await expect(
      service.submitRegistration('user-1', '2024/2025', 'first', 'https://new.url/file.pdf')
    ).rejects.toMatchObject({ statusCode: 409, code: 'REGISTRATION_ALREADY_VERIFIED' });
  });
});

describe('RegistrationService.reviewRegistration', () => {
  it('marks a registration as verified', async () => {
    prismaMock.courseRegistration.findUnique.mockResolvedValue(mockReg);
    prismaMock.courseRegistration.update.mockResolvedValue({ ...mockReg, status: RegistrationStatus.verified });

    const result = await service.reviewRegistration('reg-1', 'dept-1', 'admin-1', 'verified', null);
    expect(result.status).toBe('verified');
  });

  it('marks a registration as rejected with a note', async () => {
    prismaMock.courseRegistration.findUnique.mockResolvedValue(mockReg);
    prismaMock.courseRegistration.update.mockResolvedValue({
      ...mockReg, status: RegistrationStatus.rejected, reviewNote: 'Wrong form',
    });

    const result = await service.reviewRegistration('reg-1', 'dept-1', 'admin-1', 'rejected', 'Wrong form');
    expect(result.status).toBe('rejected');
    expect(result.reviewNote).toBe('Wrong form');
  });
});
