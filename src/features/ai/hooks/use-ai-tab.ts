"use client";

import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";

import { tashkentDate } from "@/shared/lib/scope";

import {
  AI_PERIODS,
  DEFAULT_AI_PERIOD,
  DRAFT_STATUSES,
  type AiPeriod,
  type DraftStatus,
} from "../model/ai.schema";

/** «Tahlil» — topilmalar va AI xulosasi; «Chat» — suhbatlar; «Loyihalar» — AI yozgan xabarlar; «Xarajat». */
export const AI_TABS = ["findings", "chat", "drafts", "usage"] as const;
export type AiTab = (typeof AI_TABS)[number];

/** Ochiq varaq URL da: havola ulashiladi, «orqaga» ishlaydi. */
export const useAiTab = () => {
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(AI_TABS).withDefault("findings"));
  return { tab, setTab: (next: AiTab) => void setTab(next === "findings" ? null : next) };
};

/** Tahlil davri URL da (`?aiPeriod=7d`) — global davr filtri bilan to'qnashmasin. */
export const useAiPeriod = () => {
  const [period, setPeriod] = useQueryState(
    "aiPeriod",
    parseAsStringLiteral(AI_PERIODS).withDefault(DEFAULT_AI_PERIOD),
  );
  return {
    period,
    setPeriod: (next: AiPeriod) => void setPeriod(next === DEFAULT_AI_PERIOD ? null : next),
  };
};

/** Ochiq suhbat URL da (`?chat=3`). */
export const useSelectedChat = () => {
  const [chatId, setChatId] = useQueryState("chat", parseAsInteger);
  return { chatId, selectChat: (id: number | null) => void setChatId(id) };
};

/** Loyihalar filtri URL da (`?drafts=sent`); sukut — yuborilmaganlar. */
export const useDraftStatus = () => {
  const [status, setStatus] = useQueryState(
    "drafts",
    parseAsStringLiteral(DRAFT_STATUSES).withDefault("draft"),
  );
  return { status, setStatus: (next: DraftStatus) => void setStatus(next === "draft" ? null : next) };
};

/** Xarajat oyi URL da (`?month=2026-10`); sukut — joriy oy (Toshkent). */
export const useUsageMonth = () => {
  const current = tashkentDate(new Date()).slice(0, 7);
  const [month, setMonth] = useQueryState("month", parseAsString.withDefault(current));
  return {
    month: /^\d{4}-\d{2}$/.test(month) ? month : current,
    current,
    setMonth: (next: string) => void setMonth(next === current ? null : next),
  };
};
