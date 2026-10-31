import { parseJson } from "@/shared/lib/envelope";
import { apiGet, apiSend } from "@/shared/lib/http";

import {
  aiStatusSchema,
  analysisSchema,
  chatAnswerSchema,
  type AiStatus,
  type Analysis,
  type ChatAnswer,
} from "../model/ai.schema";

export const loadAiStatus = async (): Promise<AiStatus> =>
  parseJson(aiStatusSchema, await apiGet("ai/status/"));

/** Sukut davr — oxirgi 30 kun; `fresh` keshni (10 daq) chetlab yangidan quradi. */
export const loadAnalysis = async (fresh = false): Promise<Analysis> => {
  const raw = analysisSchema.parse(await apiGet("ai/analysis/", fresh ? { fresh: 1 } : undefined));
  return {
    generatedAt: raw.generated_at,
    period: raw.period ? { dateFrom: raw.period.date_from, dateTo: raw.period.date_to } : null,
    findings: raw.findings,
    aiSummary: raw.ai_summary,
    model: raw.model,
    warehouseFindings: raw.warehouse_findings,
  };
};

export const askAi = async (question: string): Promise<ChatAnswer> =>
  parseJson(chatAnswerSchema, await apiSend("post", "ai/chat/", { question }));
