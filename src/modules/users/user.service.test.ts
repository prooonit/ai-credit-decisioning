import type { PrismaClient, User } from '@prisma/client';
import { UserRole } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { userService } from './user.service.js';

const tenantA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const tenantB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const userA: User = {
  id: '11111111-1111-4111-8111-111111111111',
  tenantId: tenantA,
  email: 'admin@tenant-a.test',
  name: 'Tenant A Admin',
  role: UserRole.ADMIN,
  passwordHash: 'not-a-real-password-hash',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('userService tenant isolation', () => {
  it('does not return a tenant A user when tenant B requests the same user ID', async () => {
    const findFirst = vi.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
      where.id === userA.id && where.tenantId === userA.tenantId ? userA : null,
    );
    const prisma = { user: { findFirst } } as unknown as PrismaClient;

    const result = await userService.getUser(prisma, tenantB, userA.id);

    expect(result).toBeNull();
    expect(findFirst).toHaveBeenCalledWith({ where: { id: userA.id, tenantId: tenantB } });
  });

  it('only lists users whose tenant ID matches the calling tenant', async () => {
    const findMany = vi.fn(async ({ where }: { where: { tenantId: string } }) =>
      where.tenantId === tenantA ? [userA] : [],
    );
    const prisma = { user: { findMany } } as unknown as PrismaClient;

    const tenantBUsers = await userService.listUsers(prisma, tenantB);

    expect(tenantBUsers).toEqual([]);
    expect(findMany).toHaveBeenCalledWith({
      where: { tenantId: tenantB },
      orderBy: { createdAt: 'asc' },
    });
  });
});
