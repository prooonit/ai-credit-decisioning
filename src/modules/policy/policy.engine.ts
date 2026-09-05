import { Prisma } from '@prisma/client';

import type { CreditPolicyConfiguration, DecisionInput, PolicyEvaluation, RuleResult } from './policy.types.js';

const decimalText = (value: Prisma.Decimal) => value.toFixed(2);
const missing = (rule: RuleResult['rule'], expectedValue: string | number | boolean): RuleResult => ({
  rule, status: 'MANUAL_REVIEW', actualValue: null, expectedValue,
  message: `${rule} cannot be evaluated because reliable financial evidence is missing`,
});

export class PolicyEngine {
  static evaluate(input: DecisionInput, policy: CreditPolicyConfiguration): PolicyEvaluation {
    const results: RuleResult[] = [];
    const minIncome = new Prisma.Decimal(policy.minimumMonthlyIncome);
    const maxDti = new Prisma.Decimal(policy.maximumDebtToIncomeRatio);
    const { financial, customer } = input;

    results.push(financial.creditScore === null ? missing('minimumCreditScore', policy.minimumCreditScore) : {
      rule: 'minimumCreditScore', status: financial.creditScore >= policy.minimumCreditScore ? 'PASS' : 'FAIL',
      actualValue: financial.creditScore, expectedValue: policy.minimumCreditScore,
      message: `Credit score ${financial.creditScore} ${financial.creditScore >= policy.minimumCreditScore ? 'meets' : 'is below'} minimum requirement of ${policy.minimumCreditScore}`,
    });
    results.push(customer.monthlyIncome === null ? missing('minimumMonthlyIncome', policy.minimumMonthlyIncome) : {
      rule: 'minimumMonthlyIncome', status: customer.monthlyIncome.greaterThanOrEqualTo(minIncome) ? 'PASS' : 'FAIL',
      actualValue: decimalText(customer.monthlyIncome), expectedValue: decimalText(minIncome),
      message: `Monthly income ${decimalText(customer.monthlyIncome)} ${customer.monthlyIncome.greaterThanOrEqualTo(minIncome) ? 'meets' : 'is below'} minimum requirement of ${decimalText(minIncome)}`,
    });
    results.push(financial.debtToIncomeRatio === null ? missing('maximumDebtToIncomeRatio', policy.maximumDebtToIncomeRatio) : {
      rule: 'maximumDebtToIncomeRatio', status: financial.debtToIncomeRatio.lessThanOrEqualTo(maxDti) ? 'PASS' : 'FAIL',
      actualValue: financial.debtToIncomeRatio.toFixed(4), expectedValue: maxDti.toFixed(4),
      message: `Debt-to-income ratio ${financial.debtToIncomeRatio.toFixed(4)} ${financial.debtToIncomeRatio.lessThanOrEqualTo(maxDti) ? 'is within' : 'exceeds'} maximum of ${maxDti.toFixed(4)}`,
    });
    results.push(financial.latePayments === null ? missing('maximumLatePayments', policy.maximumLatePayments) : {
      rule: 'maximumLatePayments', status: financial.latePayments <= policy.maximumLatePayments ? 'PASS' : 'FAIL',
      actualValue: financial.latePayments, expectedValue: policy.maximumLatePayments,
      message: `Late payments ${financial.latePayments} ${financial.latePayments <= policy.maximumLatePayments ? 'are within' : 'exceed'} maximum of ${policy.maximumLatePayments}`,
    });
    if (policy.identityVerificationRequired) {
      const verified = financial.identityStatus === 'VERIFIED';
      results.push({ rule: 'identityVerificationRequired', status: verified ? 'PASS' : 'MANUAL_REVIEW', actualValue: financial.identityStatus, expectedValue: true,
        message: verified ? 'Identity is verified' : 'Identity must be verified before automatic approval' });
    } else {
      results.push({ rule: 'identityVerificationRequired', status: 'PASS', actualValue: financial.identityStatus === 'VERIFIED', expectedValue: false, message: 'Identity verification is not required by this policy' });
    }
    const decision = results.some((result) => result.status === 'FAIL') ? 'REJECTED' : results.some((result) => result.status === 'MANUAL_REVIEW') ? 'MANUAL_REVIEW' : 'APPROVED';
    return { decision, ruleResults: results };
  }
}
