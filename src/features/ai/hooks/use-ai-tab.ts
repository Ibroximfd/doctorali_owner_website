"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

/** «Tahlil» — topilmalar va AI xulosasi; «Chat» — savol-javob (`status.enabled` bo'lsa). */
export const AI_TABS = ["findings", "chat"] as const;
export type AiTab = (typeof AI_TABS)[number];

/** Ochiq varaq URL da: havola ulashiladi, «orqaga» ishlaydi. */
export const useAiTab = () => {
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(AI_TABS).withDefault("findings"));
  return { tab, setTab: (next: AiTab) => void setTab(next === "findings" ? null : next) };
};
