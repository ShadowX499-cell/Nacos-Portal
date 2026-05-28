import crypto from 'crypto';
import { PrismaClient, PaymentType, PaymentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/response';
import { v4 as uuidv4 } from 'uuid';
import type { PaymentPublic } from '../../types';

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: { authorization_url: string; access_code: string; reference: string };
}

interface PaystackVerifyResponse {
  status: boolean;
  data: {
    status: string;
    reference: string;
    amount: number;
    paid_at: string;
    id: number;
  };
}

export class PaymentsService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async initiatePayment(
    studentId: string,
    studentEmail: string,
    gradebookId: string,
    departmentId: string
  ): Promise<{ authorization_url: string; reference: string }> {
    const gradebook = await this.db.gradebook.findFirst({
      where: { id: gradebookId, departmentId, status: 'published' },
    });
    if (!gradebook) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Gradebook not found or not published');

    // Check if already paid
    const existing = await this.db.payment.findFirst({
      where: {
        userId: studentId,
        type: PaymentType.result_subscription,
        status: PaymentStatus.success,
        sessionYear: gradebook.session,
        semester: gradebook.semester,
      },
    });
    if (existing) throw new AppError(409, 'CONFLICT', 'You have already paid for this result');

    const reference = uuidv4().replace(/-/g, '');

    // Create pending payment record first
    await this.db.payment.create({
      data: {
        userId: studentId,
        type: PaymentType.result_subscription,
        amount: new Prisma.Decimal(env.RESULT_SUBSCRIPTION_AMOUNT_KOBO / 100),
        currency: 'NGN',
        reference,
        status: PaymentStatus.pending,
        sessionYear: gradebook.session,
        semester: gradebook.semester,
      },
    });

    // Call Paystack
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: studentEmail,
        amount: env.RESULT_SUBSCRIPTION_AMOUNT_KOBO,
        reference,
        metadata: { gradebookId, studentId },
        callback_url: `${env.FRONTEND_URL}/student/results/verify?reference=${reference}`,
      }),
    });

    const data = (await response.json()) as PaystackInitResponse;

    if (!data.status) {
      await this.db.payment.update({ where: { reference }, data: { status: PaymentStatus.failed } });
      throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', data.message ?? 'Payment initialization failed');
    }

    return { authorization_url: data.data.authorization_url, reference };
  }

  async verifyPayment(reference: string, studentId: string): Promise<PaymentPublic> {
    const payment = await this.db.payment.findFirst({ where: { reference, userId: studentId } });
    if (!payment) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Payment not found');

    if (payment.status === PaymentStatus.success) {
      return this.toPublic(payment);
    }

    // Ask Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
    });

    const data = (await response.json()) as PaystackVerifyResponse;

    if (data.status && data.data.status === 'success') {
      const updated = await this.db.payment.update({
        where: { reference },
        data: {
          status: PaymentStatus.success,
          gatewayRef: String(data.data.id),
          paidAt: new Date(data.data.paid_at),
        },
      });
      return this.toPublic(updated);
    }

    return this.toPublic(payment);
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.verifySignature(rawBody, signature)) {
      throw new AppError(400, 'INVALID_WEBHOOK_SIGNATURE', 'Webhook signature mismatch');
    }

    const event = JSON.parse(rawBody.toString()) as {
      event: string;
      data: { reference: string; status: string; id: number; paid_at: string };
    };

    if (event.event !== 'charge.success') return;

    const { reference, id, paid_at } = event.data;

    await this.db.payment.updateMany({
      where: { reference, status: PaymentStatus.pending },
      data: {
        status: PaymentStatus.success,
        gatewayRef: String(id),
        paidAt: new Date(paid_at),
      },
    });
  }

  async getHistory(studentId: string): Promise<PaymentPublic[]> {
    const payments = await this.db.payment.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: 'desc' },
    });
    return payments.map(this.toPublic);
  }

  async initiateSchoolFees(
    studentId: string,
    studentEmail: string,
    sessionYear: string,
    departmentId: string
  ): Promise<{ authorization_url: string; reference: string }> {
    const existing = await this.db.payment.findFirst({
      where: { userId: studentId, type: PaymentType.school_fees, status: PaymentStatus.success, sessionYear },
    });
    if (existing) throw new AppError(409, 'SCHOOL_FEES_ALREADY_PAID', 'School fees already paid for this session');

    const reference = uuidv4().replace(/-/g, '');

    await this.db.payment.create({
      data: {
        userId: studentId,
        type: PaymentType.school_fees,
        amount: new Prisma.Decimal(env.SCHOOL_FEES_AMOUNT_KOBO / 100),
        currency: 'NGN',
        reference,
        status: PaymentStatus.pending,
        sessionYear,
      },
    });

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: studentEmail,
        amount: env.SCHOOL_FEES_AMOUNT_KOBO,
        reference,
        metadata: { type: 'school_fees', studentId, sessionYear },
        callback_url: `${env.FRONTEND_URL}/student/school-fees/verify?reference=${reference}`,
      }),
    });

    const data = (await response.json()) as { status: boolean; message?: string; data: { authorization_url: string } };
    if (!data.status) {
      await this.db.payment.update({ where: { reference }, data: { status: PaymentStatus.failed } });
      throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', data.message ?? 'Payment initialization failed');
    }

    return { authorization_url: data.data.authorization_url, reference };
  }

  async getSchoolFeesStatus(
    studentId: string,
    departmentId: string
  ): Promise<{ currentSession: string; status: string; amount: number; paidAt: Date | null; reference: string | null }> {
    const latestGradebook = await this.db.gradebook.findFirst({
      where: { departmentId, status: 'published' },
      orderBy: { session: 'desc' },
    });

    const year = new Date().getFullYear();
    const currentSession = latestGradebook?.session ?? `${year}/${year + 1}`;

    const payment = await this.db.payment.findFirst({
      where: { userId: studentId, type: PaymentType.school_fees, sessionYear: currentSession },
      orderBy: { createdAt: 'desc' },
    });

    return {
      currentSession,
      status: payment?.status ?? 'not_initiated',
      amount: env.SCHOOL_FEES_AMOUNT_KOBO / 100,
      paidAt: payment?.paidAt ?? null,
      reference: payment?.reference ?? null,
    };
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private verifySignature(rawBody: Buffer, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  }

  private toPublic(p: {
    id: string;
    type: PaymentType;
    amount: Prisma.Decimal;
    currency: string;
    reference: string;
    status: PaymentStatus;
    sessionYear: string | null;
    semester: string | null;
    paidAt: Date | null;
    createdAt: Date;
  }): PaymentPublic {
    return {
      id: p.id,
      type: p.type,
      amount: Number(p.amount),
      currency: p.currency,
      reference: p.reference,
      status: p.status,
      sessionYear: p.sessionYear,
      semester: p.semester,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    };
  }
}

export const paymentsService = new PaymentsService();
