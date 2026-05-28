import { Response } from 'express';
import { ApiResponse, ApiError, PaginationMeta, ValidationDetail } from '../types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: PaginationMeta
): Response {
  const body: ApiResponse<T> = { success: true, data, message, ...(meta ? { meta } : {}) };
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: ValidationDetail[]
): Response {
  const body: ApiError = {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  };
  return res.status(statusCode).json(body);
}

/** Wraps an async route handler so errors propagate to express errorHandler */
export function asyncHandler<T extends unknown[]>(
  fn: (...args: T) => Promise<unknown>
): (...args: T) => void {
  return (...args: T): void => {
    Promise.resolve(fn(...args)).catch(args[2] as (err: unknown) => void);
  };
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: ValidationDetail[]
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
