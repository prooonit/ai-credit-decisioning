import { env } from '../../config/env.js';
import type { EvaluationEvidence } from '../decision/decision.types.js';
import { aiAnalysisSchema, type AiAnalysis, type AiProvider } from './ai.types.js';

const systemPrompt = `You are an AI assistant supporting a credit decisioning system.

Analyze the supplied applicant evidence.

Rules:
- Use ONLY the supplied evidence.
- Never invent financial information.
- Never assume missing information.
- Do not make the final credit decision.
- The deterministic policy engine is the final authority.
- Identify positive factors.
- Identify risk factors.
- Put missing or conflicting evidence in evidenceWarnings.
- Do NOT return missingEvidence.
- Do NOT return conflictingEvidence.
- Always return summary, positiveFactors, riskFactors, and evidenceWarnings, even when arrays are empty.
- The only allowed output keys are summary, positiveFactors, riskFactors, and evidenceWarnings.
- Return structured JSON only.`;

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    positiveFactors: { type: 'array', items: { type: 'string' } },
    riskFactors: { type: 'array', items: { type: 'string' } },
    evidenceWarnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'positiveFactors', 'riskFactors', 'evidenceWarnings'],
};

const providerError = (status: number, body: string) => {
  let reason = 'No error details returned';
  try {
    const payload = JSON.parse(body) as { error?: { code?: unknown; message?: unknown; type?: unknown } };
    const error = payload.error;
    if (error) {
      reason = [error.type, error.code, error.message]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join(': ') || reason;
    }
  } catch {
    // The status remains useful if Groq returns a non-JSON upstream response.
  }
  return new Error(`Groq chat completion failed (${status}): ${reason}`);
};

export class GroqProvider implements AiProvider {
  async analyzeCreditEvidence(evidence: EvaluationEvidence): Promise<AiAnalysis> {
    if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify({ evidence }) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'credit_evidence_analysis',
            strict: true,
            schema: responseSchema,
          },
        },
        temperature: 0.2,
      }),
    });

    const body = await response.text();
    if (!response.ok) throw providerError(response.status, body);

    let payload: { choices?: Array<{ message?: { content?: unknown } }> };
    try {
      payload = JSON.parse(body) as typeof payload;
    } catch {
      throw new Error('Groq returned malformed JSON');
    }
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
      throw new Error('Groq returned an empty analysis response');
    }
    try {
      return aiAnalysisSchema.parse(JSON.parse(content));
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'invalid structured analysis';
      throw new Error(`Groq returned invalid structured analysis: ${detail}`);
    }
  }
}
