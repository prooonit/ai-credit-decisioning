import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { ConflictError } from '../../lib/errors.js';
import { paginate } from '../../lib/pagination.js';
import type { TenantContext } from '../../lib/tenant-context.js';
import { toDecimal } from '../../lib/money.js';
import type { customerCreateSchema } from './customer.schemas.js';
import type { z } from 'zod';

type CreateCustomerInput = z.infer<typeof customerCreateSchema>;

export const customerService = {
  create: async (prisma: PrismaClient, context: TenantContext, input: CreateCustomerInput) => {
    try {
      return await prisma.customer.create({
        data: {
          tenantId: context.tenantId,
          fullName: input.fullName,
          dateOfBirth: input.dateOfBirth,
          employmentType: input.employmentType,
          monthlyIncome: toDecimal(input.monthlyIncome),
          ...(input.externalReference === undefined
            ? {}
            : { externalReference: input.externalReference }),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError(
          'A customer with that external reference already exists in this tenant',
        );
      }
      throw error;
    }
  },

  list: async (prisma: PrismaClient, context: TenantContext, page: number, pageSize: number) => {
    const where = { tenantId: context.tenantId };
    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...paginate(page, pageSize),
      }),
      prisma.customer.count({ where }),
    ]);
    return { customers, total };
  },

  findById: (prisma: PrismaClient, context: TenantContext, id: string) =>
    prisma.customer.findFirst({ where: { id, tenantId: context.tenantId } }),
};
