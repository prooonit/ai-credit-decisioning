import { CreditPolicyStatus, type PrismaClient } from '@prisma/client';

export class PolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}
  getActivePolicy(tenantId: string) {
    return this.prisma.creditPolicy.findFirst({ where: { tenantId, status: CreditPolicyStatus.ACTIVE }, orderBy: { version: 'desc' } });
  }
}
