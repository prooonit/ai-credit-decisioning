import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EvaluationEvidence } from '../decision/decision.types.js';
import { GroqProvider } from './groq.provider.js';

const evidence: EvaluationEvidence = {
  application: { loanType: 'PERSONAL', requestedAmount: '100000.00' },
  customer: { employmentType: 'SALARIED', monthlyIncome: '75000.00' },
  financialProfile: { creditScore: 742, latePayments: 0, totalOutstanding: '125000.00', monthlyEmi: '8500.00', identityStatus: 'VERIFIED' },
  derivedMetrics: { debtToIncomeRatio: '0.1133' },
};

afterEach(() => vi.unstubAllGlobals());

describe('GroqProvider', () => {
  it('extracts and validates JSON-mode chat completion content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ summary: 'Strong evidence', positiveFactors: ['Verified identity'], riskFactors: [], evidenceWarnings: [] }) } }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(new GroqProvider().analyzeCreditEvidence(evidence)).resolves.toEqual({
      summary: 'Strong evidence', positiveFactors: ['Verified identity'], riskFactors: [], evidenceWarnings: [],
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      response_format: { type: 'json_schema', json_schema: { name: 'credit_evidence_analysis', strict: true } },
    });
  });

  it('reports a Groq API error without exposing credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { type: 'invalid_request_error', code: 'model_not_found', message: 'Model is unavailable' } }), { status: 400 })));
    await expect(new GroqProvider().analyzeCreditEvidence(evidence)).rejects.toThrow('400): invalid_request_error: model_not_found: Model is unavailable');
  });

  it('rejects malformed model output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{not json}' } }] }), { status: 200 })));
    await expect(new GroqProvider().analyzeCreditEvidence(evidence)).rejects.toThrow('invalid structured analysis');
  });
});
