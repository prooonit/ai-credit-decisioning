import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Data access for tenant-owned users. Every query accepts a tenantId so callers
 * cannot accidentally read or mutate users across tenant boundaries.
 */
export const userRepository = {
  listByTenant: (prisma: PrismaClient, tenantId: string) =>
    prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    }),

  findById: (prisma: PrismaClient, tenantId: string, userId: string) =>
    prisma.user.findFirst({
      where: { id: userId, tenantId },
    }),

  findByEmail: (prisma: PrismaClient, tenantId: string, email: string) =>
    prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    }),

  create: (prisma: PrismaClient, tenantId: string, data: Prisma.UserCreateWithoutTenantInput) =>
    prisma.user.create({
      data: { ...data, tenantId },
    }),
};
