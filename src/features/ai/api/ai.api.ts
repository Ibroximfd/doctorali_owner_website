import { parseJson } from "@/shared/lib/envelope";
import { apiGet, apiSend } from "@/shared/lib/http";

import { findReply } from "../model/ai.rules";
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
  type AiMessage,
  type AiMessagesPage,
  type AiPeriod,
  type AiStatus,
  type AiUsage,
  type Analysis,
  type ChatAnswer,
  type DraftStatus,
} from "../model/ai.schema";

/** Owner AI — `API_QOLLANMA` §6.8, TZ 32 §I va §C-2. AI faqat POST so'rovlarda chaqiriladi. */

/**
 * AI POST lari (hujjat 56): javob 15–30 s, backend chegarasi 90 s, BFF 120 s. Brauzer BFF dan
 * biroz ko'p kutadi — uzilish bo'lsa xatoni BFF o'zi tushunarli qaytaradi. GET lar 10 s da qoladi.
 */
export const AI_TIMEOUT_MS = 125_000;
const AI_SEND = { timeoutMs: AI_TIMEOUT_MS };

export const loadAiStatus = async (): Promise<AiStatus> =>
  parseJson(aiStatusSchema, await apiGet("ai/status/"));

/** SAQLANGAN tahlil — AI ni chaqirmaydi (§I-1); saqlangani yo'q bo'lsa `status: empty` + topilmalar. */
export const loadAnalysis = async (period: AiPeriod): Promise<Analysis> =>
  toAnalysis(analysisSchema.parse(await apiGet("ai/analysis/", { period })));

/** «Yangilash» — AI shu yerda bir marta chaqiriladi (§I-2). */
export const refreshAnalysis = async (period: AiPeriod): Promise<Analysis> =>
  toAnalysis(analysisSchema.parse(await apiSend("post", "ai/analysis/", { period }, AI_SEND)));

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
}) =>
  parseJson(
    sentMessageSchema,
    await apiSend("post", `ai/chats/${chatId}/messages/`, { text, lang }, AI_SEND),
  );

/** Tiklanish oynasi: backend 90 s dan oshmaydi (hujjat 56) + zaxira. */
export const RECOVERY_WINDOW_MS = 100_000;
export const RECOVERY_POLL_MS = 4_000;

type RecoveryDeps = {
  load?: (chatId: number, beforeId: number | null) => Promise<AiMessagesPage>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * So'rov uzilgandan keyin javobni server tarixidan qidiradi (hujjat 56): backend javobni
 * baribir tayyorlab saqlaydi. Yuborilgandan beri oyna tugaguncha har 4 s da oxirgi sahifa
 * o'qiladi; brauzer 125 s kutib uzilgan bo'lsa — bitta tekshiruv yetadi. Topilmasa `null`:
 * shundagina «Qayta yuborish» (ikkinchi AI xarajati) taklif qilinadi.
 */
export const recoverReply = async (
  {
    chatId,
    afterId,
    question,
    startedAt,
  }: { chatId: number; afterId: number | null; question: string; startedAt: number },
  { load = loadMessages, sleep = wait, now = Date.now }: RecoveryDeps = {},
): Promise<AiMessage | null> => {
  for (;;) {
    try {
      const page = await load(chatId, null);
      const found = findReply(page.messages, { afterId, question });
      if (found.kind === "answered") return found.reply;
    } catch {
      // tarix ham o'qilmadi (tarmoq) — oyna ichida yana urinamiz
    }
    if (now() + RECOVERY_POLL_MS > startedAt + RECOVERY_WINDOW_MS) return null;
    await sleep(RECOVERY_POLL_MS);
  }
};

/** ESKI tarixsiz savol — faqat `ai/chats/` backendda yo'q bo'lsa (prod). */
export const askAi = async (question: string): Promise<ChatAnswer> =>
  parseJson(chatAnswerSchema, await apiSend("post", "ai/chat/", { question }, AI_SEND));

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
