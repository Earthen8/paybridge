import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/appError.js';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message: string;
}

interface ClientRateRecord {
  count: number;
  resetAtMs: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const clientRecords = new Map<string, ClientRateRecord>();

  return function rateLimiterMiddleware(
    request: Request,
    _response: Response,
    next: NextFunction,
  ): void {
    const clientIp = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const key = `${clientIp}:${request.path}`;
    const nowMs = Date.now();
    const existing = clientRecords.get(key);

    if (!existing || nowMs > existing.resetAtMs) {
      clientRecords.set(key, { count: 1, resetAtMs: nowMs + options.windowMs });
      next();
      return;
    }

    if (existing.count >= options.maxRequests) {
      const retryAfterSeconds = Math.ceil((existing.resetAtMs - nowMs) / 1000);
      next(
        new AppError(
          options.message,
          429,
          'RATE_LIMIT_EXCEEDED',
          `Tunggu ${retryAfterSeconds} detik sebelum mencoba kembali.`,
        ),
      );
      return;
    }

    existing.count += 1;
    next();
  };
}
