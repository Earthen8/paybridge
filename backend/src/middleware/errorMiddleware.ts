import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/appError.js';

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      hasError: true,
      errorCode: error.errorCode,
      message: error.message,
      remediation: error.remediation,
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      hasError: true,
      errorCode: 'VALIDATION_ERROR',
      message: 'Input validation failed on one or more fields.',
      remediation: 'Check fieldErrors for invalid input values and resubmit.',
      fieldErrors: error.flatten().fieldErrors,
    });
    return;
  }

  const fallbackMessage =
    error instanceof Error ? error.message : 'An unexpected server error occurred.';
  const isDatabaseConnectionError = fallbackMessage.includes("Can't reach database server");

  response.status(isDatabaseConnectionError ? 503 : 500).json({
    hasError: true,
    errorCode: isDatabaseConnectionError ? 'DATABASE_UNAVAILABLE' : 'INTERNAL_SERVER_ERROR',
    message: isDatabaseConnectionError
      ? 'PostgreSQL database is unreachable at DATABASE_URL.'
      : fallbackMessage,
    remediation: isDatabaseConnectionError
      ? 'Ensure Docker Desktop or PostgreSQL is running, then run "npm run db:up" and "npm run db:push".'
      : 'Check backend server logs for detailed stack trace.',
  });
}

