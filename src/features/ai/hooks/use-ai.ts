"use client";

import { skipToken, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppError, toAppError } from "@/shared/lib/app-error";

import {
  askAi,
  createChat,
  deleteChat,
  discardDraft,
  loadAiStatus,
  loadAnalysis,
  loadChats,
  loadDrafts,
  loadMessages,
  loadUsage,
  analysisFromError,
  recoverReply,
  refreshAnalysis,
  sendDraft,
  sendMessage,
} from "../api/ai.api";
import { chatFailure, mayHaveReply, NO_REPLY_CODE } from "../model/ai.rules";
import {
  DEFAULT_AI_PERIOD,
  type AiMessage,
  type AiMessagesPage,
  type AiPeriod,
  type DraftStatus,
} from "../model/ai.schema";

const MINUTE = 60_000;
/** Saqlangan tahlil faqat «Yangilash» bilan o'zgaradi — tez-tez so'rash foyda bermaydi. */
const ANALYSIS_STALE_MS = 10 * MINUTE;
/** `status: running` (yoki `409 analysis_running`) — natija tayyor bo'lguncha qisqa interval. */
const RUNNING_POLL_MS = 4000;

export const aiKeys = {
  all: ["ai"] as const,
  status: () => [...aiKeys.all, "status"] as const,
  analysis: (period: AiPeriod) => [...aiKeys.all, "analysis", period] as const,
  chats: () => [...aiKeys.all, "chats"] as const,
  messages: (chatId: number | null) => [...aiKeys.all, "messages", chatId] as const,
  drafts: (status: DraftStatus) => [...aiKeys.all, "drafts", status] as const,
  usage: (month: string) => [...aiKeys.all, "usage", month] as const,
};

export const useAiStatusQuery = () =>
  useQuery({ queryKey: aiKeys.status(), queryFn: loadAiStatus, staleTime: 5 * MINUTE });

/** Bo'limga kirishda — SAQLANGAN natija (AI chaqirilmaydi). Hisob ketayotgan bo'lsa — kutib turadi. */
export const useAnalysisQuery = (period: AiPeriod = DEFAULT_AI_PERIOD) =>
  useQuery({
    queryKey: aiKeys.analysis(period),
    queryFn: () => loadAnalysis(period),
    staleTime: ANALYSIS_STALE_MS,
    refetchInterval: (query) => (query.state.data?.status === "running" ? RUNNING_POLL_MS : false),
  });

/**
 * «Yangilash» — `POST`. Muvaffaqiyatda natija keshga yoziladi. `409 analysis_running` va
 * `503 ai_unavailable` da javob tanasidagi `analysis` bloki darhol keshga yoziladi (kalitsiz rejim);
 * blok bo'lmasa — saqlanganini qayta o'qiymiz, ro'yxat bo'sh qolmaydi.
 */
export const useRefreshAnalysis = (period: AiPeriod) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => refreshAnalysis(period),
    onSuccess: (analysis) => queryClient.setQueryData(aiKeys.analysis(period), analysis),
    onError: (error) => {
      const { code, body } = toAppError(error);
      const fromBody = code === "ai_unavailable" ? analysisFromError(body) : null;
      if (fromBody) queryClient.setQueryData(aiKeys.analysis(period), fromBody);
      // `409`/`503` va uzilish (hujjat 56: backend natijani baribir saqlaydi) — saqlangani qayta o'qiladi
      else if (code !== "rate_limited" && code !== "validation_error")
        void queryClient.invalidateQueries({ queryKey: aiKeys.analysis(period) });
    },
  });
};

/* ---------- AI chat ---------- */

export const useChatsQuery = () => useQuery({ queryKey: aiKeys.chats(), queryFn: loadChats });

export const useCreateChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createChat,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: aiKeys.chats() }),
  });
};

export const useDeleteChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteChat,
    onSuccess: (_, chatId) => {
      queryClient.removeQueries({ queryKey: aiKeys.messages(chatId) });
      void queryClient.invalidateQueries({ queryKey: aiKeys.chats() });
    },
  });
};

/** Xabarlar — oxirgisidan boshlab, «eskilarini yuklash» `before_id = oldest_id` bilan. */
export const useMessagesQuery = (chatId: number | null) =>
  useInfiniteQuery({
    queryKey: aiKeys.messages(chatId),
    queryFn:
      chatId === null
        ? skipToken
        : ({ pageParam }: { pageParam: number | null }) => loadMessages(chatId, pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (page: AiMessagesPage) =>
      page.hasMore && page.oldestId !== null ? page.oldestId : undefined,
  });

export type SendVariables = {
  chatId: number;
  text: string;
  lang: "uz" | "ru";
  /** Yuborishdan oldingi oxirgi xabar `id` si — tiklanishda javobni ajratish uchun. */
  afterId: number | null;
  /** So'rov uzildi, server tarixi tekshirilmoqda (UI «tekshirilmoqda» holatiga o'tadi). */
  onChecking?: () => void;
};

/**
 * Xabar yuborish. Javob kelgach tarix va ro'yxat qayta o'qiladi (savol ham serverda saqlangan);
 * shu tugaguncha mutatsiya «kutilmoqda» — kutayotgan savol ekrandan yo'qolmaydi.
 * `503` da savol bazaga yozilmaydi — tarixga tegilmaydi.
 *
 * Uzilish (hujjat 56): kutish chegarasi yoki `5xx` da savol qayta YUBORILMAYDI — avval server
 * tarixi o'qiladi. Javob topilsa — muvaffaqiyat; topilmasa `no_reply` xatosi (faqat shunda
 * «Qayta yuborish» chiqadi, chunki u ikkinchi AI xarajati).
 */
export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ onChecking, afterId, ...input }: SendVariables): Promise<AiMessage> => {
      const startedAt = Date.now();
      try {
        return (await sendMessage(input)).message;
      } catch (error) {
        const appError = toAppError(error);
        const offline = typeof navigator !== "undefined" && navigator.onLine === false;
        if (offline || !mayHaveReply(chatFailure(appError))) throw appError;
        onChecking?.();
        const reply = await recoverReply({ chatId: input.chatId, afterId, question: input.text, startedAt });
        if (reply) return reply;
        throw new AppError(appError.kind, appError.message, NO_REPLY_CODE);
      }
    },
    onSettled: async (_, __, { chatId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: aiKeys.messages(chatId) }),
        queryClient.invalidateQueries({ queryKey: aiKeys.chats() }),
      ]);
    },
  });
};

/** ESKI tarixsiz savol (prod zaxirasi): javob tarixi komponentda. */
export const useAskAi = () => useMutation({ mutationFn: askAi });

/* ---------- AI loyihalari ---------- */

export const useDraftsQuery = (status: DraftStatus) =>
  useQuery({ queryKey: aiKeys.drafts(status), queryFn: () => loadDrafts(status) });

/** Har natijada (xato ham — `409` ro'yxat eskirganini bildiradi) hamma holatlar qayta o'qiladi. */
const useDraftAction = (action: (draftId: number) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: [...aiKeys.all, "drafts"] }),
  });
};

export const useSendDraft = () => useDraftAction(sendDraft);
export const useDiscardDraft = () => useDraftAction(discardDraft);

/* ---------- xarajat ---------- */

export const useUsageQuery = (month: string) =>
  useQuery({ queryKey: aiKeys.usage(month), queryFn: () => loadUsage(month), staleTime: 5 * MINUTE });
