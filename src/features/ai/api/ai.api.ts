import { parseJson } from "@/shared/lib/envelope";
import { apiGet, apiSend } from "@/shared/lib/http";

import {
  actionSchema,
  actionsResponseSchema,
  aiSummarySchema,
  autopilotSchema,
  chatSchema,
  chatsSchema,
  checksSchema,
  escalateSchema,
  findingSchema,
  findingsResponseSchema,
  recommendationsSchema,
  reportsSchema,
  sendResultSchema,
  type ActionsResponse,
  type AiAction,
  type AiCheck,
  type Autopilot,
  type AiReport,
  type AiSummary,
  type Chat,
  type ChatListItem,
  type Finding,
  type FindingsResponse,
  type Recommendation,
} from "../model/ai.schema";
import type { FeedbackVerdict } from "../model/ai.rules";

export const loadAiSummary = async (): Promise<AiSummary> =>
  parseJson(aiSummarySchema, await apiGet("ai/summary/"));

export const loadFindings = async (status: "open" | "all"): Promise<FindingsResponse> =>
  parseJson(findingsResponseSchema, await apiGet("ai/findings/", { status }));

export const sendFeedback = async (id: number, verdict: FeedbackVerdict): Promise<Finding> =>
  parseJson(findingSchema, await apiSend("post", `ai/findings/${id}/feedback/`, { verdict }));

export const escalateFinding = async (id: number): Promise<number> =>
  parseJson(escalateSchema, await apiSend("post", `ai/findings/${id}/escalate/`)).issueId;

export const loadChecks = async (): Promise<AiCheck[]> =>
  parseJson(checksSchema, await apiGet("ai/checks/")).results;

export const loadReports = async (): Promise<AiReport[]> =>
  parseJson(reportsSchema, await apiGet("ai/reports/")).results;

export const loadRecommendations = async (): Promise<Recommendation[]> =>
  parseJson(recommendationsSchema, await apiGet("ai/recommendations/")).results;

export const loadChats = async (): Promise<ChatListItem[]> =>
  parseJson(chatsSchema, await apiGet("ai/chats/")).results;

export const createChat = async (): Promise<Chat> =>
  parseJson(chatSchema, await apiSend("post", "ai/chats/", {}));

export const loadChat = async (id: number): Promise<Chat> =>
  parseJson(chatSchema, await apiGet(`ai/chats/${id}/`));

export const sendChatMessage = async (chatId: number, text: string) =>
  parseJson(sendResultSchema, await apiSend("post", `ai/chats/${chatId}/messages/`, { text }));

export const loadActions = async (status: "proposed" | "all"): Promise<ActionsResponse> =>
  parseJson(actionsResponseSchema, await apiGet("ai/actions/", { status }));

export const decideAction = async (id: number, decision: "approve" | "reject" | "undo"): Promise<AiAction> =>
  parseJson(actionSchema, await apiSend("post", `ai/actions/${id}/${decision}/`, {}));

export const loadAutopilot = async (): Promise<Autopilot> =>
  parseJson(autopilotSchema, await apiGet("ai/autopilot/"));

export const saveAutopilot = async (patch: {
  enabled: boolean;
  playbooks: { key: string; mode: string }[];
}): Promise<Autopilot> => parseJson(autopilotSchema, await apiSend("put", "ai/autopilot/", patch));
