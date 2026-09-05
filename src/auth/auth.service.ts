import type { PrismaClient } from '@prisma/client';
import { Prisma, TenantStatus, UserRole } from '@prisma/client';

import { AppError, ConflictError } from '../lib/errors.js';
import { hashPassword, verifyPassword } from './password.js';

type RegisterInput = {
  email: string;
  name: string;
  password: string;
  tenantName: string;
  tenantSlug: string;
};

export const authService = {
  register: async (prisma: PrismaClient, input: RegisterInput) => {
    try {
      return await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { name: input.tenantName, slug: input.tenantSlug, status: TenantStatus.ACTIVE },
        });
        const user = await tx.user.create({
          data: {
            email: input.email,
            name: input.name,
            passwordHash: await hashPassword(input.password),
          },
        });
        await tx.userTenantMembership.create({
          data: { userId: user.id, tenantId: tenant.id, role: UserRole.OWNER },
        });
        return { user, tenant };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('A user with that email or a tenant with that slug already exists');
      }
      throw error;
    }
  },

  login: async (prisma: PrismaClient, email: string, password: string) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    return user;
  },

  getUser: (prisma: PrismaClient, userId: string) =>
    prisma.user.findUnique({ where: { id: userId } }),

  listTenants: (prisma: PrismaClient, userId: string) =>
    prisma.userTenantMembership.findMany({
      where: { userId },
      include: { tenant: true },
      orderBy: { createdAt: 'asc' },
    }),
};
