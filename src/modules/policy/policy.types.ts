import { Prisma } from '@prisma/client';
import { z } from 'zod';

export const creditPolicyConfigurationSchema = z.object({
  minimumCreditScore: z.number().int().min(0).max(1000),
  minimumMonthlyIncome: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  maximumDebtToIncomeRatio: z.string().regex(/^\d+(?:\.\d{1,4})?$/),
  maximumLatePayments: z.number().int().min(0),
  identityVerificationRequired: z.boolean(),
});

export const policyCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  minCreditScore: z.number().int().positive().max(1000),
  minMonthlyIncome: z.number().positive(),
  maxDebtToIncomeRatio: z.number().positive().max(1),
  maxLatePayments: z.number().int().min(0),
  identityVerificationRequired: z.boolean(),
}).strict();

export const policyParamsSchema = z.object({ policyId: z.string().uuid() });

export type CreditPolicyConfiguration = z.infer<typeof creditPolicyConfigurationSchema>;
export type PolicyCreateInput = z.infer<typeof policyCreateSchema>;
export type RuleStatus = 'PASS' | 'FAIL' | 'MANUAL_REVIEW';
export type RuleResult = {
  rule: keyof CreditPolicyConfiguration | 'financialEvidence';
  status: RuleStatus;
  actualValue: string | number | boolean | null;
  expectedValue: string | number | boolean;
  message: string;
};

export type DecisionInput = {
  application: { applicationId: string; loanType: string; requestedAmount: Prisma.Decimal };
  customer: { customerId: string; monthlyIncome: Prisma.Decimal | null; employmentType: string };
  financial: {
    creditScore: number | null;
    totalOutstanding: Prisma.Decimal | null;
    latePayments: number | null;
    totalMonthlyEmi: Prisma.Decimal | null;
    totalOutstandingLiabilities: Prisma.Decimal | null;
    debtToIncomeRatio: Prisma.Decimal | null;
    identityStatus: string | null;
  };
};

export type PolicyEvaluation = {
  decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
  ruleResults: RuleResult[];
};
