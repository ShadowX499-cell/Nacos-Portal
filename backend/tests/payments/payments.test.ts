import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { AppError } from '../../src/utils/response';
import { PaymentType, PaymentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

const mockPayment = {
  id: 'pay-1', userId: 'user-1', type: PaymentType.school_fees,
  amount: new Prisma.Decimal(1500), currency: 'NGN',
  reference: 'ref123', gatewayRef: null,
  status: PaymentStatus.success, sessionYear: '2024/2025',
  semester: null, receiptUrl: null,
  paidAt: new Date(), createdAt: new Date(),
};

const prismaMock = {
  payment: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
  gradebook: { findFirst: vi.fn() },
};

vi.mock('../../src/config/env', () => ({
  env: {
    PAYSTACK_SECRET_KEY: 'sk_test_dummy',
    SCHOOL_FEES_AMOUNT_KOBO: 150000,
    RESULT_SUBSCRIPTION_AMOUNT_KOBO: 50000,
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

let service: PaymentsService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new PaymentsService(prismaMock as unknown as import('@prisma/client').PrismaClient);
});

describe('PaymentsService.initiateSchoolFees', () => {
  it('throws 409 when school fees already paid for the session', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(mockPayment);
    await expect(
      service.initiateSchoolFees('user-1', 'ada@test.com', '2024/2025', 'dept-1')
    ).rejects.toMatchObject({ statusCode: 409, code: 'SCHOOL_FEES_ALREADY_PAID' });
  });
});

describe('PaymentsService.getSchoolFeesStatus', () => {
  it('returns status and session from latest published gradebook', async () => {
    prismaMock.gradebook.findFirst.mockResolvedValue({ session: '2024/2025', status: 'published' });
    prismaMock.payment.findFirst.mockResolvedValue(mockPayment);

    const result = await service.getSchoolFeesStatus('user-1', 'dept-1');
    expect(result.currentSession).toBe('2024/2025');
    expect(result.status).toBe('success');
  });

  it('falls back to calendar year when no gradebook exists', async () => {
    prismaMock.gradebook.findFirst.mockResolvedValue(null);
    prismaMock.payment.findFirst.mockResolvedValue(null);

    const result = await service.getSchoolFeesStatus('user-1', 'dept-1');
    expect(result.currentSession).toMatch(/^\d{4}\/\d{4}$/);
    expect(result.status).toBe('not_initiated');
  });
});
