import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { AppError } from '../lib/errors.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validate-request.js';
import { tenantService } from '../modules/tenants/tenant.service.js';

const tenantSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/)
    .transform((value) => value.toLowerCase()),
});

const tenantParamsSchema = z.object({ tenantId: z.string().uuid() });

const serializeMembership = (membership: {
  id: string;
  tenantId: string;
  role: string;
  tenant: { id: string; name: string; slug: string; status: string };
}) => ({
  membershipId: membership.id,
  tenantId: membership.tenantId,
  role: membership.role,
  name: membership.tenant.name,
  slug: membership.tenant.slug,
  status: membership.tenant.status,
});

export const createTenantRouter = (prisma: PrismaClient) => {
  const router = Router();
  router.use(authenticate);

  router.post('/', validateRequest(tenantSchema), async (req, res, next) => {
    try {
      const { tenant, membership } = await tenantService.create(
        prisma,
        req.auth!.userId,
        req.body as z.infer<typeof tenantSchema>,
      );
      res.status(201).json({
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status },
        membership: { id: membership.id, role: membership.role },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/', async (req, res, next) => {
    try {
      const memberships = await tenantService.listForUser(prisma, req.auth!.userId);
      res.status(200).json({ tenants: memberships.map(serializeMembership) });
    } catch (error) {
      next(error);
    }
  });

  router.get(
    '/:tenantId',
    validateRequest(tenantParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { tenantId } = req.params as z.infer<typeof tenantParamsSchema>;
        const membership = await tenantService.findForUser(prisma, req.auth!.userId, tenantId);
        if (!membership) {
          throw new AppError(
            'You do not belong to the requested tenant',
            403,
            'TENANT_ACCESS_DENIED',
          );
        }
        res.status(200).json({ tenant: serializeMembership(membership) });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
