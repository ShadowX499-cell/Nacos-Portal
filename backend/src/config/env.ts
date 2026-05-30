/**
 * Centralised, typed environment configuration.
 * Fails fast at startup if required variables are missing.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? '';
}

function getEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function getEnvInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Environment variable ${key} must be an integer`);
  return parsed;
}

export const env = {
  NODE_ENV: getEnv('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  PORT: getEnvInt('PORT', 5000),
  FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:3000'),

  // Database
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // Redis
  REDIS_URL: getEnv('REDIS_URL', 'redis://localhost:6379'),

  // JWT
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '15m'),
  REFRESH_TOKEN_EXPIRES_IN: getEnv('REFRESH_TOKEN_EXPIRES_IN', '7d'),

  // Email
  SMTP_HOST: getEnv('SMTP_HOST', 'smtp.mailtrap.io'),
  SMTP_PORT: getEnvInt('SMTP_PORT', 2525),
  SMTP_USER: getEnv('SMTP_USER', ''),
  SMTP_PASS: getEnv('SMTP_PASS', ''),
  EMAIL_FROM: getEnv('EMAIL_FROM', 'noreply@nacos-aifue.edu.ng'),

  // Paystack
  PAYSTACK_SECRET_KEY: getEnv('PAYSTACK_SECRET_KEY', ''),
  PAYSTACK_PUBLIC_KEY: getEnv('PAYSTACK_PUBLIC_KEY', ''),
  RESULT_SUBSCRIPTION_AMOUNT_KOBO: getEnvInt('RESULT_SUBSCRIPTION_AMOUNT_KOBO', 100000),
  SCHOOL_FEES_AMOUNT_KOBO: getEnvInt('SCHOOL_FEES_AMOUNT_KOBO', 300000),

  // AWS S3
  AWS_ACCESS_KEY_ID: getEnv('AWS_ACCESS_KEY_ID', ''),
  AWS_SECRET_ACCESS_KEY: getEnv('AWS_SECRET_ACCESS_KEY', ''),
  AWS_S3_BUCKET: getEnv('AWS_S3_BUCKET', ''),
  AWS_REGION: getEnv('AWS_REGION', 'af-south-1'),

  // Biometric (Electron/Desktop only)
  BIOMETRIC_ENCRYPTION_KEY: getEnv('BIOMETRIC_ENCRYPTION_KEY', ''),
} as const;
