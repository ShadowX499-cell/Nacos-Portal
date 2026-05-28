import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/response';
import { env } from '../config/env';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Known application error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Prisma unique constraint violation (P2002)
  if (isPrismaError(err) && err.code === 'P2002') {
    const fields = (err.meta as { target?: string[] })?.target ?? [];
    res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `A record with the same ${fields.join(', ')} already exists`,
      },
    });
    return;
  }

  // Prisma record not found (P2025)
  if (isPrismaError(err) && err.code === 'P2025') {
    res.status(404).json({
      success: false,
      error: { code: 'RESOURCE_NOT_FOUND', message: 'Record not found' },
    });
    return;
  }

  // Generic / unexpected error
  const message =
    env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : (err instanceof Error ? err.message : String(err));

  if (env.NODE_ENV !== 'test') {
    console.error('[ErrorHandler]', err);
  }

  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message },
  });
}

function isPrismaError(err: unknown): err is { code: string; meta?: unknown } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  );
}
