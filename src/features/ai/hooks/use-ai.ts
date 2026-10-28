"use client";

import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createChat,
  decideAction,
  loadActions,
  loadAutopilot,
  saveAutopilot,
  escalateFinding,
  loadAiSummary,
  loadChat,
  loadChats,
  loadChecks,
  loadFindings,
  loadRecommendations,
  loadReports,
  sendChatMessage,
  sendFeedback,
} from "../api/ai.api";
import { hasPendingReply, type FeedbackVerdict } from "../model/ai.rules";
import type { Chat } from "../model/ai.schema";

const MINUTE = 60_000;
/** AI javobi tayyorlanayotganda chat shu oraliqda qayta so'raladi. */
const REPLY_POLL_MS = 1500;

export const aiKeys = {
  all: ["ai"] as const,
  summary: () => [...aiKeys.all, "summary"] as const,
  findings: (status: "open" | "all") => [...aiKeys.all, "findings", status] as const,
  checks: () => [...aiKeys.all, "checks"] as const,
  reports: () => [...aiKeys.all, "reports"] as const,
  recommendations: () => [...aiKeys.all, "recommendations"] as const,
  chats: () => [...aiKeys.all, "chats"] as const,
  chat: (id: number | null) => [...aiKeys.all, "chat", id] as const,
  actions: (status: "proposed" | "all") => [...aiKeys.all, "actions", status] as const,
  autopilot: () => [...aiKeys.all, "autopilot"] as const,
};

export const useAiSummaryQuery = () =>
  useQuery({ queryKey: aiKeys.summary(), queryFn: loadAiSummary, refetchInterval: MINUTE });

export const useFindingsQuery = (status: "open" | "all") =>
  useQuery({
    queryKey: aiKeys.findings(status),
    queryFn: () => loadFindings(status),
    refetchInterval: MINUTE,
    placeholderData: (previous) => previous,
  });

export const useChecksQuery = () =>
  useQuery({ queryKey: aiKeys.checks(), queryFn: loadChecks, refetchInterval: MINUTE });
export const useReportsQuery = () => useQuery({ queryKey: aiKeys.reports(), queryFn: loadReports });
export const useRecommendationsQuery = () =>
  useQuery({ queryKey: aiKeys.recommendations(), queryFn: loadRecommendations });

/** Topilmaga baho: AI keyingi tahlilda shuni hisobga oladi. */
export const useFindingFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, verdict }: { id: number; verdict: FeedbackVerdict }) => sendFeedback(id, verdict),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: aiKeys.all }),
  });
};

/** Topilmani Muammolar markaziga o'tkazish (idempotent). */
export const useEscalateFinding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: escalateFinding,
    // Muammolar soni boshqa bo'limlarda ham bor — hammasi yangilanadi.
    onSuccess: () => void queryClient.invalidateQueries(),
  });
};

export const useChatsQuery = () => useQuery({ queryKey: aiKeys.chats(), queryFn: loadChats });

/** Javob kutilayotgan bo'lsa — tez-tez, aks holda so'ralmaydi. */
export const useChatQuery = (id: number | null) =>
  useQuery({
    queryKey: aiKeys.chat(id),
    queryFn: id === null ? skipToken : () => loadChat(id),
    refetchInterval: (query) => (hasPendingReply(query.state.data) ? REPLY_POLL_MS : false),
  });

export const useCreateChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createChat,
    onSuccess: (chat) => {
      queryClient.setQueryData(aiKeys.chat(chat.id), chat);
      void queryClient.invalidateQueries({ queryKey: aiKeys.chats() });
    },
  });
};

/** Savol yuboriladi; javob «tayyorlanmoqda» holatida darhol chatga qo'shiladi, keyin so'rov bilan to'ladi. */
export const useSendChatMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, text }: { chatId: number; text: string }) => sendChatMessage(chatId, text),
    onSuccess: ({ message, reply }, { chatId }) => {
      queryClient.setQueryData<Chat>(aiKeys.chat(chatId), (chat) =>
        chat ? { ...chat, messages: [...chat.messages, message, reply] } : chat,
      );
      void queryClient.invalidateQueries({ queryKey: aiKeys.chat(chatId) });
      void queryClient.invalidateQueries({ queryKey: aiKeys.chats() });
    },
  });
};

export const useActionsQuery = (status: "proposed" | "all") =>
  useQuery({
    queryKey: aiKeys.actions(status),
    queryFn: () => loadActions(status),
    refetchInterval: MINUTE,
    placeholderData: (previous) => previous,
  });

/** Tasdiqlash / rad etish / bekor qilish — biznes ma'lumoti o'zgaradi, hamma so'rovlar yangilanadi. */
export const useDecideAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "approve" | "reject" | "undo" }) =>
      decideAction(id, decision),
    onSuccess: () => void queryClient.invalidateQueries(),
  });
};

export const useAutopilotQuery = () => useQuery({ queryKey: aiKeys.autopilot(), queryFn: loadAutopilot });

export const useSaveAutopilot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveAutopilot,
    onSuccess: (data) => queryClient.setQueryData(aiKeys.autopilot(), data),
  });
};
