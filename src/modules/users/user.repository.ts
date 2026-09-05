import type { PrismaClient } from '@prisma/client';

import type { TenantContext } from '../../lib/tenant-context.js';

/**
 * Data access for tenant-owned users. Every query accepts a tenantId so callers
 * cannot accidentally read or mutate users across tenant boundaries.
 */
export const userRepository = {
  listByTenant: (prisma: PrismaClient, context: TenantContext) =>
    prisma.userTenantMembership.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    }),

  findById: (prisma: PrismaClient, context: TenantContext, userId: string) =>
    prisma.userTenantMembership.findFirst({
      where: { userId, tenantId: context.tenantId },
      include: { user: true },
    }),

  findByEmail: (prisma: PrismaClient, context: TenantContext, email: string) =>
    prisma.userTenantMembership.findFirst({
      where: { tenantId: context.tenantId, user: { email } },
      include: { user: true },
    }),
};
