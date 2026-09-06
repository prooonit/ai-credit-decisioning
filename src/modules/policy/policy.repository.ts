import { CreditPolicyStatus, type PrismaClient } from '@prisma/client';

type PolicyDb = Pick<PrismaClient, 'creditPolicy'>;

export class PolicyRepository {
  constructor(private readonly prisma: PolicyDb) {}

  getActivePolicy(tenantId: string) {
    return this.prisma.creditPolicy.findFirst({ where: { tenantId, status: CreditPolicyStatus.ACTIVE }, orderBy: { version: 'desc' } });
  }

  list(tenantId: string) {
    return this.prisma.creditPolicy.findMany({ where: { tenantId }, orderBy: { version: 'desc' } });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.creditPolicy.findFirst({ where: { id, tenantId } });
  }

  findLatest(tenantId: string) {
    return this.prisma.creditPolicy.findFirst({ where: { tenantId }, orderBy: { version: 'desc' }, select: { version: true } });
  }
}
