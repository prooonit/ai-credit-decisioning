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
  customerCreateSchema,
  customerListSchema,
  customerParamsSchema,
} from './customer.schemas.js';
import { customerService } from './customer.service.js';

const serialize = (customer: { monthlyIncome: { toFixed: (digits: number) => string } }) => ({
  ...customer,
  monthlyIncome: formatMoney(customer.monthlyIncome as never),
});

export const createCustomerRouter = (prisma: PrismaClient) => {
  const router = Router();
  router.use(authenticate, createTenantContext(prisma));

  router.post(
    '/',
    requireRole(UserRole.OWNER, UserRole.ADMIN, UserRole.ANALYST),
    validateRequest(customerCreateSchema),
    async (req, res, next) => {
      try {
        const customer = await customerService.create(
          prisma,
          req.tenantContext!,
          getValidated<z.infer<typeof customerCreateSchema>>(req, 'body'),
        );
        res.status(201).json({ customer: serialize(customer) });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/', validateRequest(customerListSchema, 'query'), async (req, res, next) => {
    try {
      const { page, pageSize } = getValidated<z.infer<typeof customerListSchema>>(req, 'query');
      const result = await customerService.list(prisma, req.tenantContext!, page, pageSize);
      res
        .status(200)
        .json({ customers: result.customers.map(serialize), page, pageSize, total: result.total });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', validateRequest(customerParamsSchema, 'params'), async (req, res, next) => {
    try {
      const { id } = getValidated<z.infer<typeof customerParamsSchema>>(req, 'params');
      const customer = await customerService.findById(prisma, req.tenantContext!, id);
      if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
      res.status(200).json({ customer: serialize(customer) });
    } catch (error) {
      next(error);
    }
  });
  return router;
};
