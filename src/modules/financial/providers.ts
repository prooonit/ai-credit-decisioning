import type { PrismaClient } from '@prisma/client';

import { formatMoney } from '../../lib/money.js';

export type CreditProfileResult = {
  creditScore: number;
  totalOutstanding: string;
  latePayments: number;
};
export type BankAccountResult = {
  id: string;
  institutionName: string;
  accountType: string;
  maskedAccountNumber: string;
  currentBalance: string;
  availableBalance: string;
};
export type BankTransactionResult = {
  transactionDate: Date;
  type: string;
  amount: string;
  category: string;
  description: string;
  balanceAfter: string;
};
export type LiabilityResult = {
  type: string;
  lenderName: string;
  outstandingAmount: string;
  monthlyEmi: string;
  status: string;
};
export type IdentityVerificationResult = {
  status: string;
  provider: string;
  reference: string;
  verifiedAt: Date | null;
};

export interface CreditProvider {
  getCreditProfile(customerId: string, tenantId: string): Promise<CreditProfileResult | null>;
}
export interface BankingProvider {
  getBankAccounts(customerId: string, tenantId: string): Promise<BankAccountResult[]>;
  getRecentTransactions(customerId: string, tenantId: string): Promise<BankTransactionResult[]>;
}
export interface LiabilityProvider {
  getLiabilities(customerId: string, tenantId: string): Promise<LiabilityResult[]>;
}
export interface IdentityProvider {
  verifyIdentity(customerId: string, tenantId: string): Promise<IdentityVerificationResult | null>;
}

export class SyntheticCreditProvider implements CreditProvider {
  constructor(private readonly prisma: PrismaClient) {}
  async getCreditProfile(customerId: string, tenantId: string) {
    const profile = await this.prisma.creditProfile.findFirst({ where: { customerId, tenantId } });
    return profile
      ? {
          creditScore: profile.creditScore,
          totalOutstanding: formatMoney(profile.totalOutstanding),
          latePayments: profile.latePayments,
        }
      : null;
  }
}
export class SyntheticBankingProvider implements BankingProvider {
  constructor(private readonly prisma: PrismaClient) {}
  async getBankAccounts(customerId: string, tenantId: string) {
    const accounts = await this.prisma.bankAccount.findMany({ where: { customerId, tenantId } });
    return accounts.map((a) => ({
      id: a.id,
      institutionName: a.institutionName,
      accountType: a.accountType,
      maskedAccountNumber: a.maskedAccountNumber,
      currentBalance: formatMoney(a.currentBalance),
      availableBalance: formatMoney(a.availableBalance),
    }));
  }
  async getRecentTransactions(customerId: string, tenantId: string) {
    const transactions = await this.prisma.bankTransaction.findMany({
      where: { customerId, tenantId },
      orderBy: { transactionDate: 'desc' },
      take: 50,
    });
    return transactions.map((t) => ({
      transactionDate: t.transactionDate,
      type: t.type,
      amount: formatMoney(t.amount),
      category: t.category,
      description: t.description,
      balanceAfter: formatMoney(t.balanceAfter),
    }));
  }
}
export class SyntheticLiabilityProvider implements LiabilityProvider {
  constructor(private readonly prisma: PrismaClient) {}
  async getLiabilities(customerId: string, tenantId: string) {
    const liabilities = await this.prisma.liability.findMany({ where: { customerId, tenantId } });
    return liabilities.map((l) => ({
      type: l.type,
      lenderName: l.lenderName,
      outstandingAmount: formatMoney(l.outstandingAmount),
      monthlyEmi: formatMoney(l.monthlyEmi),
      status: l.status,
    }));
  }
}
export class SyntheticIdentityProvider implements IdentityProvider {
  constructor(private readonly prisma: PrismaClient) {}
  async verifyIdentity(customerId: string, tenantId: string) {
    const result = await this.prisma.identityVerification.findFirst({
      where: { customerId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return result
      ? {
          status: result.status,
          provider: result.provider,
          reference: result.reference,
          verifiedAt: result.verifiedAt,
        }
      : null;
  }
}
