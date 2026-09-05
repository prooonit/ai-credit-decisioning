import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';

import { authService } from '../auth/auth.service.js';
import { authenticate } from '../middleware/authenticate.js';

export const createMeRouter = (prisma: PrismaClient) => {
  const router = Router();

  router.get('/tenants', authenticate, async (req, res, next) => {
    try {
      const memberships = await authService.listTenants(prisma, req.auth!.userId);
      res.status(200).json({
        tenants: memberships.map((membership) => ({
          membershipId: membership.id,
          tenantId: membership.tenantId,
          role: membership.role,
          name: membership.tenant.name,
          slug: membership.tenant.slug,
          status: membership.tenant.status,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
