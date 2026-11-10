import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError.js';
import { verifyAuthToken, AuthTokenPayload } from '../utils/tokenUtils.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export function requireAuth(
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction,
): void {
  const authorizationHeader = request.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    next(
      new AppError(
        'Authentication failed because the Authorization Bearer header is missing.',
        401,
        'UNAUTHORIZED',
        'Include a valid "Authorization: Bearer <token>" header in the request.',
      ),
    );
    return;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  try {
    request.user = verifyAuthToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

