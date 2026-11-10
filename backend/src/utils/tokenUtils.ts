import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './appError.js';

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
  } catch {
    throw new AppError(
      'Authentication token verification failed because the token is expired or invalid.',
      401,
      'INVALID_AUTH_TOKEN',
      'Sign in again to obtain a fresh access token.',
    );
  }
}

export function generateRandomHexToken(byteLength = 16): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

export function createMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey = env.MIDTRANS_SERVER_KEY,
): string {
  const rawSignatureInput = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  return crypto.createHash('sha512').update(rawSignatureInput).digest('hex');
}

