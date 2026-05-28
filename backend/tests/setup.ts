/**
 * Global test setup — runs before all test files.
 * Sets environment variables needed by services under test.
 */
import { vi } from 'vitest';

// Provide minimal env for tests (services read from process.env via env.ts)
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long-for-testing';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '1025';
process.env.SMTP_USER = 'test';
process.env.SMTP_PASS = 'test';
process.env.EMAIL_FROM = 'test@test.com';
