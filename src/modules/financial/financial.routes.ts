import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/errors.js';
import { authenticate } from '../../middleware/authenticate.js';
import { createTenantContext } from '../../middleware/tenant-context.js';
import { getValidated, validateRequest } from '../../middleware/validate-request.js';
import { customerService } from '../customers/customer.service.js';
import { FinancialProfileService } from './financial-profile.service.js';
import {
  SyntheticBankingProvider,
  SyntheticCreditProvider,
  SyntheticIdentityProvider,
  SyntheticLiabilityProvider,
} from './providers.js';

const paramsSchema = z.object({ id: z.string().uuid() });
export const createFinancialRouter = (prisma: PrismaClient) => {
  const router = Router();
  const service = new FinancialProfileService(
    new SyntheticCreditProvider(prisma),
    new SyntheticBankingProvider(prisma),
    new SyntheticLiabilityProvider(prisma),
    new SyntheticIdentityProvider(prisma),
  );
  router.use(authenticate, createTenantContext(prisma));
  router.get(
    '/:id/financial-profile',
    validateRequest(paramsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { id } = getValidated<z.infer<typeof paramsSchema>>(req, 'params');
        if (!(await customerService.findById(prisma, req.tenantContext!, id)))
          throw new AppError('Customer not found', 404, 'NOT_FOUND');
        res.status(200).json(await service.getProfile(id, req.tenantContext!.tenantId));
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
};
