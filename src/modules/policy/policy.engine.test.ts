import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { PolicyEngine } from './policy.engine.js';
import type { CreditPolicyConfiguration, DecisionInput } from './policy.types.js';

const policy: CreditPolicyConfiguration = {
  minimumCreditScore: 700, minimumMonthlyIncome: '50000.00', maximumDebtToIncomeRatio: '0.40',
  maximumLatePayments: 2, identityVerificationRequired: true,
};
const input = (overrides: Partial<DecisionInput['financial']> = {}, income = '75000.00'): DecisionInput => ({
  application: { applicationId: 'application', loanType: 'PERSONAL', requestedAmount: new Prisma.Decimal('250000.00') },
  customer: { customerId: 'customer', monthlyIncome: new Prisma.Decimal(income), employmentType: 'SALARIED' },
  financial: {
    creditScore: 742, totalOutstanding: new Prisma.Decimal('125000.00'), latePayments: 0,
    totalMonthlyEmi: new Prisma.Decimal('8500.00'), totalOutstandingLiabilities: new Prisma.Decimal('125000.00'),
    debtToIncomeRatio: new Prisma.Decimal('0.1133'), identityStatus: 'VERIFIED', ...overrides,
  },
});

describe('PolicyEngine', () => {
  it('approves when all rules pass', () => expect(PolicyEngine.evaluate(input(), policy).decision).toBe('APPROVED'));
  it('rejects a low credit score', () => expect(PolicyEngine.evaluate(input({ creditScore: 699 }), policy).decision).toBe('REJECTED'));
  it('rejects low income', () => expect(PolicyEngine.evaluate(input({}, '49999.99'), policy).decision).toBe('REJECTED'));
  it('rejects excessive DTI', () => expect(PolicyEngine.evaluate(input({ debtToIncomeRatio: new Prisma.Decimal('0.4001') }), policy).decision).toBe('REJECTED'));
  it('rejects too many late payments', () => expect(PolicyEngine.evaluate(input({ latePayments: 3 }), policy).decision).toBe('REJECTED'));
  it('sends unverified identity to manual review', () => expect(PolicyEngine.evaluate(input({ identityStatus: 'PENDING' }), policy).decision).toBe('MANUAL_REVIEW'));
  it('rejects when failures are mixed with manual-review conditions', () => expect(PolicyEngine.evaluate(input({ creditScore: 650, identityStatus: null }), policy).decision).toBe('REJECTED'));
  it('sends missing financial evidence to manual review', () => {
    const result = PolicyEngine.evaluate(input({ creditScore: null }), policy);
    expect(result.decision).toBe('MANUAL_REVIEW');
    expect(result.ruleResults.find((rule) => rule.rule === 'minimumCreditScore')?.status).toBe('MANUAL_REVIEW');
  });
});
