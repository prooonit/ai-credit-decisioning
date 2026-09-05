import type { PrismaClient } from '@prisma/client';

import { AppError } from '../../lib/errors.js';
import { toDecimal } from '../../lib/money.js';
import { paginate } from '../../lib/pagination.js';
import type { TenantContext } from '../../lib/tenant-context.js';
import type { applicationCreateSchema, applicationListSchema } from './application.schemas.js';
import type { z } from 'zod';

type CreateApplicationInput = z.infer<typeof applicationCreateSchema>;
type ApplicationListInput = z.infer<typeof applicationListSchema>;

export const applicationService = {
  create: async (prisma: PrismaClient, context: TenantContext, input: CreateApplicationInput) => {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, tenantId: context.tenantId },
      select: { id: true },
    });
    if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');

    return prisma.loanApplication.create({
      data: {
        tenantId: context.tenantId,
        customerId: customer.id,
        loanType: input.loanType,
        requestedAmount: toDecimal(input.requestedAmount),
      },
    });
  },

  list: async (prisma: PrismaClient, context: TenantContext, input: ApplicationListInput) => {
    const where = { tenantId: context.tenantId, ...(input.status ? { status: input.status } : {}) };
    const [applications, total] = await prisma.$transaction([
      prisma.loanApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...paginate(input.page, input.pageSize),
      }),
      prisma.loanApplication.count({ where }),
    ]);
    return { applications, total };
  },

  findById: (prisma: PrismaClient, context: TenantContext, id: string) =>
    prisma.loanApplication.findFirst({ where: { id, tenantId: context.tenantId } }),
};
