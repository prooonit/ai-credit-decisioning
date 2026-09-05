import type { DecisionInput } from '../policy/policy.types.js';

export type EvaluationEvidence = {
  application: { loanType: string; requestedAmount: string };
  customer: { employmentType: string; monthlyIncome: string | null };
  financialProfile: {
    creditScore: number | null;
    latePayments: number | null;
    totalOutstanding: string | null;
    monthlyEmi: string | null;
    identityStatus: string | null;
  };
  derivedMetrics: { debtToIncomeRatio: string | null };
};

export const toEvaluationEvidence = (input: DecisionInput): EvaluationEvidence => ({
  application: {
    loanType: input.application.loanType,
    requestedAmount: input.application.requestedAmount.toFixed(2),
  },
  customer: {
    employmentType: input.customer.employmentType,
    monthlyIncome: input.customer.monthlyIncome?.toFixed(2) ?? null,
  },
  financialProfile: {
    creditScore: input.financial.creditScore,
    latePayments: input.financial.latePayments,
    totalOutstanding: input.financial.totalOutstanding?.toFixed(2) ?? null,
    monthlyEmi: input.financial.totalMonthlyEmi?.toFixed(2) ?? null,
    identityStatus: input.financial.identityStatus,
  },
  derivedMetrics: {
    debtToIncomeRatio: input.financial.debtToIncomeRatio?.toFixed(4) ?? null,
  },
});
