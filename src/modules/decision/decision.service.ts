import { ApplicationStatus, Prisma, type PrismaClient } from '@prisma/client';

import { AppError, ConflictError } from '../../lib/errors.js';
import type { TenantContext } from '../../lib/tenant-context.js';
import { FinancialProfileService } from '../financial/financial-profile.service.js';
import { SyntheticBankingProvider, SyntheticCreditProvider, SyntheticIdentityProvider, SyntheticLiabilityProvider } from '../financial/providers.js';
import { PolicyEngine } from '../policy/policy.engine.js';
import { PolicyRepository } from '../policy/policy.repository.js';
import { creditPolicyConfigurationSchema, type DecisionInput } from '../policy/policy.types.js';
import { toEvaluationEvidence, type EvaluationEvidence } from './decision.types.js';

const sum = (values: string[]) => values.reduce((total, value) => total.plus(value), new Prisma.Decimal(0));

export class CreditDecisionService {
  private readonly policies: PolicyRepository;
  private readonly financialProfiles: FinancialProfileService;

  constructor(private readonly prisma: PrismaClient, financialProfiles?: FinancialProfileService) {
    this.policies = new PolicyRepository(prisma);
    this.financialProfiles = financialProfiles ?? new FinancialProfileService(
      new SyntheticCreditProvider(prisma), new SyntheticBankingProvider(prisma),
      new SyntheticLiabilityProvider(prisma), new SyntheticIdentityProvider(prisma),
    );
  }

  async evaluate(
    context: TenantContext,
    applicationId: string,
    onEvidence?: (evidence: EvaluationEvidence) => Promise<void>,
  ) {
    const application = await this.prisma.loanApplication.findFirst({
      where: { id: applicationId, tenantId: context.tenantId },
      include: { customer: true, creditDecision: true },
    });
    if (!application) throw new AppError('Loan application not found', 404, 'NOT_FOUND');
    if (application.creditDecision) return { application, decision: application.creditDecision };
    if (application.status === ApplicationStatus.EVALUATING) throw new ConflictError('Loan application is already being evaluated');
    const evaluableStatuses: ApplicationStatus[] = [ApplicationStatus.PENDING, ApplicationStatus.FAILED];
    if (!evaluableStatuses.includes(application.status)) {
      throw new ConflictError('Only pending or failed loan applications can be evaluated');
    }

    const claimed = await this.prisma.loanApplication.updateMany({
      where: { id: applicationId, tenantId: context.tenantId, status: { in: [ApplicationStatus.PENDING, ApplicationStatus.FAILED] } },
      data: { status: ApplicationStatus.EVALUATING },
    });
    if (claimed.count !== 1) throw new ConflictError('Loan application is already being evaluated');

    try {
      const [profile, policy] = await Promise.all([
        this.financialProfiles.getProfile(application.customerId, context.tenantId),
        this.policies.getActivePolicy(context.tenantId),
      ]);
      if (!policy) throw new AppError('No active credit policy found for this tenant', 409, 'POLICY_NOT_FOUND');
      const configuration = creditPolicyConfigurationSchema.parse(policy.configuration);
      const totalMonthlyEmi = profile.liabilities ? sum(profile.liabilities.map((liability) => liability.monthlyEmi)) : null;
      const totalOutstandingLiabilities = profile.liabilities ? sum(profile.liabilities.map((liability) => liability.outstandingAmount)) : null;
      const monthlyIncome = application.customer.monthlyIncome;
      const debtToIncomeRatio = totalMonthlyEmi && monthlyIncome.greaterThan(0) ? totalMonthlyEmi.dividedBy(monthlyIncome) : null;
      const input: DecisionInput = {
        application: { applicationId: application.id, loanType: application.loanType, requestedAmount: application.requestedAmount },
        customer: { customerId: application.customerId, monthlyIncome, employmentType: application.customer.employmentType },
        financial: {
          creditScore: profile.credit?.creditScore ?? null,
          totalOutstanding: profile.credit ? new Prisma.Decimal(profile.credit.totalOutstanding) : null,
          latePayments: profile.credit?.latePayments ?? null,
          totalMonthlyEmi, totalOutstandingLiabilities, debtToIncomeRatio,
          identityStatus: profile.identity?.status ?? null,
        },
      };
      // AI analysis is intentionally best-effort. It cannot alter or interrupt policy evaluation.
      if (onEvidence) {
        try {
          await onEvidence(toEvaluationEvidence(input));
        } catch {
          // The agent reports AI unavailability while this service proceeds deterministically.
        }
      }
      const evaluated = PolicyEngine.evaluate(input, configuration);
      const result = await this.prisma.$transaction(async (tx) => {
        const decision = await tx.creditDecision.create({ data: {
          tenantId: context.tenantId, applicationId: application.id, policyId: policy.id,
          policyVersion: policy.version, decision: evaluated.decision, ruleResults: evaluated.ruleResults,
        } });
        const updatedApplication = await tx.loanApplication.update({
          where: { id: application.id }, data: { status: evaluated.decision },
        });
        return { application: updatedApplication, decision };
      });
      return result;
    } catch (error) {
      await this.prisma.loanApplication.updateMany({ where: { id: applicationId, tenantId: context.tenantId, status: ApplicationStatus.EVALUATING }, data: { status: ApplicationStatus.FAILED } });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const decision = await this.prisma.creditDecision.findFirst({ where: { applicationId, tenantId: context.tenantId } });
        const currentApplication = await this.prisma.loanApplication.findFirst({ where: { id: applicationId, tenantId: context.tenantId } });
        if (decision && currentApplication) return { application: currentApplication, decision };
      }
      throw error;
    }
  }
}
