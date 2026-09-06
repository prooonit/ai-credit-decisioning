import { UserRole, type PrismaClient } from '@prisma/client';
import { Router } from 'express';
import type { z } from 'zod';

import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/require-role.js';
import { createTenantContext } from '../../middleware/tenant-context.js';
import { getValidated, validateRequest } from '../../middleware/validate-request.js';
import { policyCreateSchema, policyParamsSchema } from './policy.types.js';
import { PolicyService } from './policy.service.js';

export const createPolicyRouter = (prisma: PrismaClient) => {
  const router = Router();
  const service = new PolicyService(prisma);
  router.use(authenticate, createTenantContext(prisma));

  router.post('/', requireRole(UserRole.OWNER, UserRole.ADMIN), validateRequest(policyCreateSchema), async (req, res, next) => {
    try {
      const policy = await service.create(req.tenantContext!, getValidated<z.infer<typeof policyCreateSchema>>(req, 'body'));
      res.status(201).json({ policy });
    } catch (error) { next(error); }
  });

  router.get('/', requireRole(UserRole.OWNER, UserRole.ADMIN, UserRole.ANALYST), async (req, res, next) => {
    try { res.status(200).json({ policies: await service.list(req.tenantContext!) }); } catch (error) { next(error); }
  });

  router.get('/:policyId', requireRole(UserRole.OWNER, UserRole.ADMIN, UserRole.ANALYST), validateRequest(policyParamsSchema, 'params'), async (req, res, next) => {
    try {
      const { policyId } = getValidated<z.infer<typeof policyParamsSchema>>(req, 'params');
      res.status(200).json({ policy: await service.findById(req.tenantContext!, policyId) });
    } catch (error) { next(error); }
  });

  router.post('/:policyId/activate', requireRole(UserRole.OWNER, UserRole.ADMIN), validateRequest(policyParamsSchema, 'params'), async (req, res, next) => {
    try {
      const { policyId } = getValidated<z.infer<typeof policyParamsSchema>>(req, 'params');
      res.status(200).json({ policy: await service.activate(req.tenantContext!, policyId) });
    } catch (error) { next(error); }
  });

  router.post('/:policyId/archive', requireRole(UserRole.OWNER, UserRole.ADMIN), validateRequest(policyParamsSchema, 'params'), async (req, res, next) => {
    try {
      const { policyId } = getValidated<z.infer<typeof policyParamsSchema>>(req, 'params');
      res.status(200).json({ policy: await service.archive(req.tenantContext!, policyId) });
    } catch (error) { next(error); }
  });
  return router;
};
