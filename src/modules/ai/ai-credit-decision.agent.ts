import type { TenantContext } from '../../lib/tenant-context.js';
import { CreditDecisionService } from '../decision/decision.service.js';
import { aiAnalysisSchema, type AiAnalysis, type AiProvider } from './ai.types.js';
import { GroqProvider } from './groq.provider.js';

export class AiCreditDecisionAgent {
  constructor(
    private readonly decisions: CreditDecisionService,
    private readonly aiProvider: AiProvider = new GroqProvider(),
  ) {}

  async evaluate(context: TenantContext, applicationId: string) {
    const aiResult: { analysis: AiAnalysis | null; status: 'COMPLETED' | 'UNAVAILABLE' } = {
      analysis: null,
      status: 'UNAVAILABLE',
    };
    const result = await this.decisions.evaluate(context, applicationId, async (evidence) => {
      try {
        aiResult.analysis = aiAnalysisSchema.parse(await this.aiProvider.analyzeCreditEvidence(evidence));
        aiResult.status = 'COMPLETED';
      } catch (error) {
        // Do not log credentials or customer/financial evidence. The decision remains deterministic.
        const message = error instanceof Error ? error.message : 'Unknown AI provider error';
        console.warn(`AI analysis unavailable: ${message}`);
        aiResult.analysis = null;
        aiResult.status = 'UNAVAILABLE';
      }
    });
    return { ...result, aiAnalysis: aiResult.analysis, aiStatus: aiResult.status };
  }
}
