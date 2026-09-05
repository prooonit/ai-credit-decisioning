import type { PrismaClient } from '@prisma/client';

import type { TenantContext } from '../../lib/tenant-context.js';
import { userRepository } from './user.repository.js';

export const userService = {
  listUsers: (prisma: PrismaClient, context: TenantContext) =>
    userRepository.listByTenant(prisma, context),

  getUser: (prisma: PrismaClient, context: TenantContext, userId: string) =>
    userRepository.findById(prisma, context, userId),

  getUserByEmail: (prisma: PrismaClient, context: TenantContext, email: string) =>
    userRepository.findByEmail(prisma, context, email.trim().toLowerCase()),
};
