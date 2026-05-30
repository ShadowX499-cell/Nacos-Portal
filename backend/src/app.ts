import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import adminRoutes from './modules/admin/admin.routes';
import gradebookRoutes from './modules/gradebooks/gradebook.routes';
import resultsRoutes from './modules/results/results.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import registrationRoutes from './modules/registration/registration.routes';
import electionsRoutes from './modules/elections/elections.routes';
import complianceRoutes from './modules/student/compliance.routes';

const app: Application = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Cookie parsing ────────────────────────────────────────────────────────────
app.use(cookieParser());

// ── Raw body for Paystack webhook (must be before express.json) ───────────────
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── HTTP logging ──────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Static file serving for uploaded photos ───────────────────────────────────
app.use('/api/v1/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/gradebooks', gradebookRoutes);
app.use('/api/v1/results', resultsRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/registration', registrationRoutes);
app.use('/api/v1/elections', electionsRoutes);
app.use('/api/v1/student', complianceRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'RESOURCE_NOT_FOUND', message: 'Route not found' },
  });
});

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

export default app;
