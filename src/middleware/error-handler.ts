import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { AppError, RequestValidationError } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} was not found`, 404, 'NOT_FOUND'));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  void _next;

  const normalizedError =
    error instanceof ZodError
      ? new RequestValidationError(error.flatten())
      : error instanceof AppError
        ? error
        : new AppError('Internal server error');

  res.status(normalizedError.statusCode).json({
    error: {
      code: normalizedError.code,
      message: normalizedError.message,
      ...(normalizedError.details === undefined ? {} : { details: normalizedError.details }),
    },
  });
};
