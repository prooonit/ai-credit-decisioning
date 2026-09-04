import type { Prisma, PrismaClient } from '@prisma/client';

import { userRepository } from './user.repository.js';

export const userService = {
  listUsers: (prisma: PrismaClient, tenantId: string) =>
    userRepository.listByTenant(prisma, tenantId),

  getUser: (prisma: PrismaClient, tenantId: string, userId: string) =>
    userRepository.findById(prisma, tenantId, userId),

  getUserByEmail: (prisma: PrismaClient, tenantId: string, email: string) =>
    userRepository.findByEmail(prisma, tenantId, email.trim().toLowerCase()),

  createUser: (prisma: PrismaClient, tenantId: string, data: Prisma.UserCreateWithoutTenantInput) =>
    userRepository.create(prisma, tenantId, {
      ...data,
      email: data.email.trim().toLowerCase(),
    }),
};
