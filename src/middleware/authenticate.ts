import type { RequestHandler } from 'express';

import { verifyAccessToken } from '../auth/jwt.js';
import { AppError } from '../lib/errors.js';

export const authenticate: RequestHandler = async (req, _res, next) => {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined;

  if (!token) {
    next(new AppError('Authentication is required', 401, 'UNAUTHENTICATED'));
    return;
  }

  try {
    req.auth = await verifyAccessToken(token);
    next();
  } catch {
    next(new AppError('Invalid or expired authentication token', 401, 'UNAUTHENTICATED'));
  }
};
