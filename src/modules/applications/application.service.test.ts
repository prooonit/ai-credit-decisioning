import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import type { TenantContext } from '../../lib/tenant-context.js';
import { applicationCreateSchema, applicationListSchema } from './application.schemas.js';
import { applicationService } from './application.service.js';

const tenantA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const tenantB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const customerB = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const context: TenantContext = {
  userId: 'user-a',
  tenantId: tenantA,
  role: 'ADMIN',
  membershipId: 'membership-a',
};

describe('loan application tenant isolation', () => {
  it('does not create an application for a customer owned by another tenant', async () => {
    const findFirst = vi.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
      where.id === customerB && where.tenantId === tenantB ? { id: customerB } : null,
    );
    const create = vi.fn();
    const prisma = {
      customer: { findFirst },
      loanApplication: { create },
    } as unknown as PrismaClient;
    const input = applicationCreateSchema.parse({
      customerId: customerB,
      loanType: 'PERSONAL',
      requestedAmount: '500000.00',
    });

    await expect(applicationService.create(prisma, context, input)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: customerB, tenantId: tenantA },
      select: { id: true },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('validates loan types, money, pagination, and status filters', () => {
    expect(
      applicationCreateSchema.safeParse({
        customerId: customerB,
        loanType: 'INVALID',
        requestedAmount: '20.00',
      }).success,
    ).toBe(false);
    expect(
      applicationCreateSchema.safeParse({
        customerId: customerB,
        loanType: 'PERSONAL',
        requestedAmount: '20.999',
      }).success,
    ).toBe(false);
    expect(applicationListSchema.parse({ status: 'PENDING', page: '1', pageSize: '20' })).toEqual({
      status: 'PENDING',
      page: 1,
      pageSize: 20,
    });
  });
});
