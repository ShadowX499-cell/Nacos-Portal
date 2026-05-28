import { Request, Response } from 'express';
import { paymentsService } from './payments.service';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest } from '../../types';

/** POST /api/v1/payments/initiate */
export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const { gradebookId } = req.body as { gradebookId: string };

  const { prisma } = await import('../../config/prisma');
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'User not found' } });
    return;
  }

  const result = await paymentsService.initiatePayment(sub, user.email, gradebookId, departmentId);
  sendSuccess(res, result, 'Payment initiated', 201);
});

/** GET /api/v1/payments/verify/:reference */
export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const { sub } = (req as AuthRequest).user;
  const payment = await paymentsService.verifyPayment(req.params.reference, sub);
  sendSuccess(res, payment, 'Payment verified');
});

/** POST /api/v1/payments/webhook — no JWT auth, HMAC verified inside service */
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string;
  if (!signature) {
    res.status(400).json({ success: false, error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Missing signature' } });
    return;
  }

  // req.body is a raw Buffer here (set by express.raw in app.ts)
  await paymentsService.handleWebhook(req.body as Buffer, signature);
  res.status(200).json({ received: true });
});

/** GET /api/v1/payments */
export const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => {
  const { sub } = (req as AuthRequest).user;
  const payments = await paymentsService.getHistory(sub);
  sendSuccess(res, payments, 'Payment history retrieved');
});

/** POST /api/v1/payments/school-fees/initiate */
export const initiateSchoolFees = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const { sessionYear } = req.body as { sessionYear: string };

  const { prisma } = await import('../../config/prisma');
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'User not found' } });
    return;
  }

  const result = await paymentsService.initiateSchoolFees(sub, user.email, sessionYear, departmentId);
  sendSuccess(res, result, 'School fees payment initiated', 201);
});

/** GET /api/v1/payments/school-fees/status */
export const getSchoolFeesStatus = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const result = await paymentsService.getSchoolFeesStatus(sub, departmentId);
  sendSuccess(res, result, 'School fees status retrieved');
});
