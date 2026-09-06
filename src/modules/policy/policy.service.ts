import { CreditPolicyStatus, Prisma, type PrismaClient } from '@prisma/client';

import { AppError, ConflictError } from '../../lib/errors.js';
import type { TenantContext } from '../../lib/tenant-context.js';
import { PolicyRepository } from './policy.repository.js';
import type { PolicyCreateInput } from './policy.types.js';

export class PolicyService {
  private readonly policies: PolicyRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.policies = new PolicyRepository(prisma);
  }

  list(context: TenantContext) {
    return this.policies.list(context.tenantId);
  }

  async findById(context: TenantContext, policyId: string) {
    const policy = await this.policies.findById(context.tenantId, policyId);
    if (!policy) throw new AppError('Credit policy not found', 404, 'NOT_FOUND');
    return policy;
  }

  async create(context: TenantContext, input: PolicyCreateInput) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const repository = new PolicyRepository(tx);
        const latest = await repository.findLatest(context.tenantId);
        return tx.creditPolicy.create({
          data: {
            tenantId: context.tenantId,
            name: input.name,
            version: (latest?.version ?? 0) + 1,
            status: CreditPolicyStatus.DRAFT,
            configuration: {
              minimumCreditScore: input.minCreditScore,
              minimumMonthlyIncome: new Prisma.Decimal(input.minMonthlyIncome).toFixed(2),
              maximumDebtToIncomeRatio: new Prisma.Decimal(input.maxDebtToIncomeRatio).toFixed(4),
              maximumLatePayments: input.maxLatePayments,
              identityVerificationRequired: input.identityVerificationRequired,
            },
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('A policy version was created concurrently; retry the request');
      }
      throw error;
    }
  }

  async activate(context: TenantContext, policyId: string) {
    return this.prisma.$transaction(async (tx) => {
      const repository = new PolicyRepository(tx);
      const target = await repository.findById(context.tenantId, policyId);
      if (!target) throw new AppError('Credit policy not found', 404, 'NOT_FOUND');
      if (target.status === CreditPolicyStatus.ACTIVE) throw new ConflictError('Credit policy is already active');
      if (target.status === CreditPolicyStatus.ARCHIVED) throw new ConflictError('Archived credit policies cannot be activated');

      await tx.creditPolicy.updateMany({
        where: { tenantId: context.tenantId, status: CreditPolicyStatus.ACTIVE },
        data: { status: CreditPolicyStatus.ARCHIVED },
      });
      return tx.creditPolicy.update({ where: { id: target.id }, data: { status: CreditPolicyStatus.ACTIVE } });
    });
  }

  async archive(context: TenantContext, policyId: string) {
    const policy = await this.findById(context, policyId);
    if (policy.status === CreditPolicyStatus.ACTIVE) {
      throw new ConflictError('An active credit policy cannot be archived');
    }
    if (policy.status === CreditPolicyStatus.ARCHIVED) return policy;
    return this.prisma.creditPolicy.update({
      where: { id: policy.id }, data: { status: CreditPolicyStatus.ARCHIVED },
    });
  }
}
