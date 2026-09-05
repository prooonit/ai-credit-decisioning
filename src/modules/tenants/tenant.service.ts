import type { PrismaClient } from '@prisma/client';
import { Prisma, TenantStatus, UserRole } from '@prisma/client';

import { ConflictError } from '../../lib/errors.js';

type CreateTenantInput = {
  name: string;
  slug: string;
};

export const tenantService = {
  create: async (prisma: PrismaClient, userId: string, input: CreateTenantInput) => {
    try {
      return await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { name: input.name, slug: input.slug, status: TenantStatus.ACTIVE },
        });
        const membership = await tx.userTenantMembership.create({
          data: { userId, tenantId: tenant.id, role: UserRole.OWNER },
        });
        return { tenant, membership };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('A tenant with that slug already exists');
      }
      throw error;
    }
  },

  listForUser: (prisma: PrismaClient, userId: string) =>
    prisma.userTenantMembership.findMany({
      where: { userId },
      include: { tenant: true },
      orderBy: { createdAt: 'asc' },
    }),

  findForUser: (prisma: PrismaClient, userId: string, tenantId: string) =>
    prisma.userTenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: { tenant: true },
    }),
};
