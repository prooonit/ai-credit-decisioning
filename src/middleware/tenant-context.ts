import type { PrismaClient } from '@prisma/client';
import type { RequestHandler } from 'express';

import { AppError } from '../lib/errors.js';

/** Resolves tenant role from the database; headers are never trusted as authority. */
export const createTenantContext =
  (prisma: PrismaClient): RequestHandler =>
  async (req, _res, next) => {
    if (!req.auth) {
      next(new AppError('Authentication is required', 401, 'UNAUTHENTICATED'));
      return;
    }

    const tenantId = req.header('x-tenant-id');
    if (!tenantId) {
      next(new AppError('X-Tenant-ID header is required', 400, 'TENANT_HEADER_REQUIRED'));
      return;
    }

    try {
      const membership = await prisma.userTenantMembership.findUnique({
        where: { userId_tenantId: { userId: req.auth.userId, tenantId } },
      });

      if (!membership) {
        next(
          new AppError('You do not belong to the requested tenant', 403, 'TENANT_ACCESS_DENIED'),
        );
        return;
      }

      req.tenantContext = {
        userId: req.auth.userId,
        tenantId: membership.tenantId,
        role: membership.role,
        membershipId: membership.id,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
