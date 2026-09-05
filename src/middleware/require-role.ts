import type { UserRole } from '@prisma/client';
import type { RequestHandler } from 'express';

import { AppError } from '../lib/errors.js';

export const requireRole =
  (...allowedRoles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.tenantContext) {
      next(new AppError('Tenant context is required', 500, 'TENANT_CONTEXT_MISSING'));
      return;
    }

    if (!allowedRoles.includes(req.tenantContext.role)) {
      next(new AppError('You do not have permission for this action', 403, 'FORBIDDEN'));
      return;
    }

    next();
  };
