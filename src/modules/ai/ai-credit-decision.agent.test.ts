import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../../lib/errors.js';
import type { CreditDecisionService } from '../decision/decision.service.js';
import type { EvaluationEvidence } from '../decision/decision.types.js';
import { AiCreditDecisionAgent } from './ai-credit-decision.agent.js';
import type { AiProvider } from './ai.types.js';

const context = { userId: 'user', tenantId: 'tenant', role: 'ANALYST' as const, membershipId: 'membership' };
const evidence: EvaluationEvidence = {
  application: { loanType: 'PERSONAL', requestedAmount: '100000.00' },
  customer: { employmentType: 'SALARIED', monthlyIncome: '75000.00' },
  financialProfile: { creditScore: 742, latePayments: 0, totalOutstanding: '125000.00', monthlyEmi: '8500.00', identityStatus: 'VERIFIED' },
  derivedMetrics: { debtToIncomeRatio: '0.1133' },
};

const decisionResult = (decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW') => ({
  application: { id: 'application', status: decision, requestedAmount: new Prisma.Decimal('100000.00') },
  decision: { id: 'decision', decision, policyVersion: 1, ruleResults: [] },
});

const decisionService = (decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW') => ({
  evaluate: vi.fn(async (_context, _applicationId, onEvidence) => {
    await onEvidence?.(evidence);
    return decisionResult(decision);
  }),
}) as unknown as CreditDecisionService;

describe('AiCreditDecisionAgent', () => {
  it.each(['APPROVED', 'REJECTED', 'MANUAL_REVIEW'] as const)('returns the deterministic %s outcome alongside AI analysis', async (outcome) => {
    const provider: AiProvider = { analyzeCreditEvidence: vi.fn().mockResolvedValue({ summary: 'Evidence summary', positiveFactors: [], riskFactors: [], evidenceWarnings: [] }) };
    const result = await new AiCreditDecisionAgent(decisionService(outcome), provider).evaluate(context, 'application');
    expect(result.decision.decision).toBe(outcome);
    expect(result.aiStatus).toBe('COMPLETED');
    expect(result.aiAnalysis?.summary).toBe('Evidence summary');
  });

  it('does not allow AI commentary to override the deterministic decision', async () => {
    const provider: AiProvider = { analyzeCreditEvidence: vi.fn().mockResolvedValue({ summary: 'This looks risky', positiveFactors: [], riskFactors: ['Provider commentary says reject'], evidenceWarnings: [] }) };
    const result = await new AiCreditDecisionAgent(decisionService('APPROVED'), provider).evaluate(context, 'application');
    expect(result.decision.decision).toBe('APPROVED');
    expect(result.aiStatus).toBe('COMPLETED');
  });

  it('returns UNAVAILABLE when the provider fails without changing the decision', async () => {
    const provider: AiProvider = { analyzeCreditEvidence: vi.fn().mockRejectedValue(new Error('timeout')) };
    const result = await new AiCreditDecisionAgent(decisionService('REJECTED'), provider).evaluate(context, 'application');
    expect(result.decision.decision).toBe('REJECTED');
    expect(result.aiAnalysis).toBeNull();
    expect(result.aiStatus).toBe('UNAVAILABLE');
  });

  it('returns UNAVAILABLE for invalid provider output', async () => {
    const provider = { analyzeCreditEvidence: vi.fn().mockResolvedValue({ summary: 42 }) } as unknown as AiProvider;
    const result = await new AiCreditDecisionAgent(decisionService('MANUAL_REVIEW'), provider).evaluate(context, 'application');
    expect(result.decision.decision).toBe('MANUAL_REVIEW');
    expect(result.aiAnalysis).toBeNull();
    expect(result.aiStatus).toBe('UNAVAILABLE');
  });

  it('preserves cross-tenant not-found protection from the decision service', async () => {
    const service = { evaluate: vi.fn().mockRejectedValue(new AppError('Loan application not found', 404, 'NOT_FOUND')) } as unknown as CreditDecisionService;
    const provider: AiProvider = { analyzeCreditEvidence: vi.fn() };
    await expect(new AiCreditDecisionAgent(service, provider).evaluate(context, 'other-tenant-application')).rejects.toMatchObject({ statusCode: 404 });
    expect(provider.analyzeCreditEvidence).not.toHaveBeenCalled();
  });
});
