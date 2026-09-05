import { UserRole } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import type { z } from 'zod';

import { AppError } from '../../lib/errors.js';
import { formatMoney } from '../../lib/money.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/require-role.js';
import { createTenantContext } from '../../middleware/tenant-context.js';
import { validateRequest } from '../../middleware/validate-request.js';
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
          req.body as z.infer<typeof applicationCreateSchema>,
        );
        res.status(201).json({ application: serialize(application) });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/', validateRequest(applicationListSchema, 'query'), async (req, res, next) => {
    try {
      const input = req.query as unknown as z.infer<typeof applicationListSchema>;
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
      const { id } = req.params as z.infer<typeof applicationParamsSchema>;
      const application = await applicationService.findById(prisma, req.tenantContext!, id);
      if (!application) throw new AppError('Loan application not found', 404, 'NOT_FOUND');
      res.status(200).json({ application: serialize(application) });
    } catch (error) {
      next(error);
    }
  });
  return router;
};
