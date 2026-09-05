import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { RequestValidationError } from '../lib/errors.js';

type RequestPart = 'body' | 'params' | 'query';

/** Validates and stores parsed Zod output without assigning to Express's read-only query getter. */
export const validateRequest =
  <T>(schema: ZodType<T>, part: RequestPart = 'body'): RequestHandler =>
  (req, _res, next) => {
    const parsed = schema.safeParse(req[part]);
    if (!parsed.success) {
      next(new RequestValidationError(parsed.error.flatten()));
      return;
    }
    req.validated = { ...req.validated, [part]: parsed.data };
    next();
  };

export const getValidated = <T>(request: Express.Request, part: RequestPart): T =>
  request.validated?.[part] as T;
