import { CreditPolicyStatus, type PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import type { TenantContext } from '../../lib/tenant-context.js';
import { policyCreateSchema } from './policy.types.js';
import { PolicyService } from './policy.service.js';

const context: TenantContext = { userId: 'user', tenantId: 'tenant-a', role: 'OWNER', membershipId: 'membership' };
const input = policyCreateSchema.parse({
  name: 'Standard Policy', minCreditScore: 700, minMonthlyIncome: 50_000,
  maxDebtToIncomeRatio: 0.4, maxLatePayments: 2, identityVerificationRequired: true,
});

const createPrisma = () => {
  const creditPolicy = {
    findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(),
  };
  const prisma = {
    creditPolicy,
    $transaction: vi.fn(async (callback: (tx: { creditPolicy: typeof creditPolicy }) => unknown) => callback({ creditPolicy })),
  } as unknown as PrismaClient;
  return { prisma, creditPolicy };
};

describe('PolicyService', () => {
  it('creates the first tenant policy as version 1 and DRAFT', async () => {
    const { prisma, creditPolicy } = createPrisma();
    creditPolicy.findFirst.mockResolvedValue(null);
    creditPolicy.create.mockImplementation(async ({ data }) => ({ id: 'policy-1', ...data }));

    const policy = await new PolicyService(prisma).create(context, input);

    expect(policy).toMatchObject({ version: 1, status: CreditPolicyStatus.DRAFT, tenantId: 'tenant-a' });
    expect(creditPolicy.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      configuration: expect.objectContaining({ minimumMonthlyIncome: '50000.00', maximumDebtToIncomeRatio: '0.4000' }),
    }) }));
  });

  it('increments the version from the highest tenant-local version', async () => {
    const { prisma, creditPolicy } = createPrisma();
    creditPolicy.findFirst.mockResolvedValue({ version: 4 });
    creditPolicy.create.mockImplementation(async ({ data }) => data);

    await expect(new PolicyService(prisma).create(context, input)).resolves.toMatchObject({ version: 5 });
  });

  it('activates a draft policy transactionally after archiving the prior active policy', async () => {
    const { prisma, creditPolicy } = createPrisma();
    creditPolicy.findFirst.mockResolvedValue({ id: 'draft-policy', tenantId: 'tenant-a', status: CreditPolicyStatus.DRAFT });
    creditPolicy.updateMany.mockResolvedValue({ count: 1 });
    creditPolicy.update.mockResolvedValue({ id: 'draft-policy', status: CreditPolicyStatus.ACTIVE });

    await expect(new PolicyService(prisma).activate(context, 'draft-policy')).resolves.toMatchObject({ status: CreditPolicyStatus.ACTIVE });
    expect(creditPolicy.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', status: CreditPolicyStatus.ACTIVE },
      data: { status: CreditPolicyStatus.ARCHIVED },
    });
  });

  it('does not expose a policy from another tenant', async () => {
    const { prisma, creditPolicy } = createPrisma();
    creditPolicy.findFirst.mockResolvedValue(null);

    await expect(new PolicyService(prisma).findById(context, 'other-policy')).rejects.toMatchObject({ statusCode: 404 });
    expect(creditPolicy.findFirst).toHaveBeenCalledWith({ where: { id: 'other-policy', tenantId: 'tenant-a' } });
  });

  it('does not archive the active policy', async () => {
    const { prisma, creditPolicy } = createPrisma();
    creditPolicy.findFirst.mockResolvedValue({ id: 'active-policy', tenantId: 'tenant-a', status: CreditPolicyStatus.ACTIVE });

    await expect(new PolicyService(prisma).archive(context, 'active-policy')).rejects.toMatchObject({ statusCode: 409 });
    expect(creditPolicy.update).not.toHaveBeenCalled();
  });
});
