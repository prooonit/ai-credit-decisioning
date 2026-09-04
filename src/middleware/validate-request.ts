import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { RequestValidationError } from '../lib/errors.js';

type RequestPart = 'body' | 'params' | 'query';

/** Validates a single request part and replaces it with its parsed Zod output. */
export const validateRequest =
  <T>(schema: ZodType<T>, part: RequestPart = 'body'): RequestHandler =>
  (req, _res, next) => {
    const parsed = schema.safeParse(req[part]);

    if (!parsed.success) {
      next(new RequestValidationError(parsed.error.flatten()));
      return;
    }

    Object.assign(req, { [part]: parsed.data });
    next();
  };
