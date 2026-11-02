import { parseJson } from "@/shared/lib/envelope";
import { apiGet, apiSend } from "@/shared/lib/http";

import {
  aiChatsSchema,
  aiMessagesPageSchema,
  aiStatusSchema,
  analysisSchema,
  chatAnswerSchema,
  createdChatSchema,
  draftActionSchema,
  draftsSchema,
  sentMessageSchema,
  toAnalysis,
  usageSchema,
  type AiChat,
  type AiDraft,
  type AiMessagesPage,
  type AiPeriod,
  type AiStatus,
  type AiUsage,
  type Analysis,
  type ChatAnswer,
  type DraftStatus,
} from "../model/ai.schema";

/** Owner AI — `API_QOLLANMA` §6.8, TZ 32 §I va §C-2. AI faqat POST so'rovlarda chaqiriladi. */

export const loadAiStatus = async (): Promise<AiStatus> =>
  parseJson(aiStatusSchema, await apiGet("ai/status/"));

/** SAQLANGAN tahlil — AI ni chaqirmaydi (§I-1); saqlangani yo'q bo'lsa `status: empty` + topilmalar. */
export const loadAnalysis = async (period: AiPeriod): Promise<Analysis> =>
  toAnalysis(analysisSchema.parse(await apiGet("ai/analysis/", { period })));

/** «Yangilash» — AI shu yerda bir marta chaqiriladi (§I-2). */
export const refreshAnalysis = async (period: AiPeriod): Promise<Analysis> =>
  toAnalysis(analysisSchema.parse(await apiSend("post", "ai/analysis/", { period })));

/**
 * Kalitsiz rejim (TZ 32 §I): `503 ai_unavailable` tanasida to'liq `analysis` bloki keladi —
 * topilmalar qo'shimcha so'rovsiz yangilanadi. Blok yo'q yoki buzuq bo'lsa — `null`.
 */
export const analysisFromError = (body: unknown): Analysis | null => {
  if (typeof body !== "object" || body === null || !("analysis" in body)) return null;
  const block = (body as { analysis: unknown }).analysis;
  // topilmalarsiz blok — natija emas (saqlangani qayta o'qiladi)
  if (
    typeof block !== "object" ||
    block === null ||
    !Array.isArray((block as { findings?: unknown }).findings)
  )
    return null;
  const parsed = analysisSchema.safeParse(block);
  return parsed.success ? toAnalysis(parsed.data) : null;
};

/* ---------- AI chat (§I-3) ---------- */

export const loadChats = async (): Promise<AiChat[]> => parseJson(aiChatsSchema, await apiGet("ai/chats/"));

/** Yangi suhbat — AI chaqirilmaydi. */
export const createChat = async (): Promise<AiChat> =>
  parseJson(createdChatSchema, await apiSend("post", "ai/chats/", {}));

export const deleteChat = async (chatId: number): Promise<void> => {
  await apiSend("delete", `ai/chats/${chatId}/`);
};

export const MESSAGES_PAGE_SIZE = 30;

export const loadMessages = async (chatId: number, beforeId: number | null): Promise<AiMessagesPage> =>
  parseJson(
    aiMessagesPageSchema,
    await apiGet(`ai/chats/${chatId}/messages/`, {
      before_id: beforeId ?? undefined,
      limit: MESSAGES_PAGE_SIZE,
    }),
  );

/** HAR xabar — bitta AI chaqiruvi; javob savol tilida. */
export const sendMessage = async ({
  chatId,
  text,
  lang,
}: {
  chatId: number;
  text: string;
  lang: "uz" | "ru";
}) => parseJson(sentMessageSchema, await apiSend("post", `ai/chats/${chatId}/messages/`, { text, lang }));

/** ESKI tarixsiz savol — faqat `ai/chats/` backendda yo'q bo'lsa (prod). */
export const askAi = async (question: string): Promise<ChatAnswer> =>
  parseJson(chatAnswerSchema, await apiSend("post", "ai/chat/", { question }));

/* ---------- AI loyihalari (§C-2) ---------- */

export const loadDrafts = async (status: DraftStatus): Promise<AiDraft[]> =>
  parseJson(draftsSchema, await apiGet("ai/drafts/", { status }));

/** Boshliq TASDIG'I bilan yuborish — AI o'zi hech qachon yubormaydi. */
export const sendDraft = async (draftId: number) =>
  parseJson(draftActionSchema, await apiSend("post", `ai/drafts/${draftId}/send/`));

export const discardDraft = async (draftId: number) =>
  parseJson(draftActionSchema, await apiSend("delete", `ai/drafts/${draftId}/send/`));

/* ---------- xarajat (§I-4) ---------- */

export const loadUsage = async (month: string): Promise<AiUsage> =>
  parseJson(usageSchema, await apiGet("ai/usage/", { month }));
