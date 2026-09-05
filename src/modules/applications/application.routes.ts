import { UserRole } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import type { z } from 'zod';

import { AppError } from '../../lib/errors.js';
import { formatMoney } from '../../lib/money.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/require-role.js';
import { createTenantContext } from '../../middleware/tenant-context.js';
import { getValidated, validateRequest } from '../../middleware/validate-request.js';
import {
  applicationCreateSchema,
  applicationListSchema,
  applicationParamsSchema,
} from './application.schemas.js';
import { applicationService } from './application.service.js';

const serialize = (application: { requestedAmount: { toFixed: (digits: number) => string } }) => ({
  ...application,
  requestedAmount: formatMoney(application.requestedAmount as never),
});

export const createApplicationRouter = (prisma: PrismaClient) => {
  const router = Router();
  router.use(authenticate, createTenantContext(prisma));

  router.post(
    '/',
    requireRole(UserRole.OWNER, UserRole.ADMIN, UserRole.ANALYST),
    validateRequest(applicationCreateSchema),
    async (req, res, next) => {
      try {
        const application = await applicationService.create(
          prisma,
          req.tenantContext!,
          getValidated<z.infer<typeof applicationCreateSchema>>(req, 'body'),
        );
        res.status(201).json({ application: serialize(application) });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/', validateRequest(applicationListSchema, 'query'), async (req, res, next) => {
    try {
      const input = getValidated<z.infer<typeof applicationListSchema>>(req, 'query');
      const result = await applicationService.list(prisma, req.tenantContext!, input);
      res.status(200).json({
        applications: result.applications.map(serialize),
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', validateRequest(applicationParamsSchema, 'params'), async (req, res, next) => {
    try {
      const { id } = getValidated<z.infer<typeof applicationParamsSchema>>(req, 'params');
      const application = await applicationService.findById(prisma, req.tenantContext!, id);
      if (!application) throw new AppError('Loan application not found', 404, 'NOT_FOUND');
      res.status(200).json({ application: serialize(application) });
    } catch (error) {
      next(error);
    }
  });
  return router;
};
