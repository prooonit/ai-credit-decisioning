import { z } from 'zod';

import type { EvaluationEvidence } from '../decision/decision.types.js';

export const aiAnalysisSchema = z.object({
  summary: z.string().min(1).max(2_000),
  positiveFactors: z.array(z.string().min(1).max(500)).max(20),
  riskFactors: z.array(z.string().min(1).max(500)).max(20),
  evidenceWarnings: z.array(z.string().min(1).max(500)).max(20),
}).strict();

export type AiAnalysis = z.infer<typeof aiAnalysisSchema>;

export interface AiProvider {
  analyzeCreditEvidence(evidence: EvaluationEvidence): Promise<AiAnalysis>;
}
