"use client";

import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";

export const AI_TABS = ["chat", "findings", "actions", "recommendations", "checks", "reports"] as const;
export type AiTab = (typeof AI_TABS)[number];

/** Ochiq varaq va chat URL da: havola ulashiladi, «orqaga» ishlaydi. */
export const useAiTab = () => {
  const [{ tab, chat }, setState] = useQueryStates({
    tab: parseAsStringLiteral(AI_TABS).withDefault("chat"),
    chat: parseAsInteger,
  });
  return {
    tab,
    chatId: chat,
    setTab: (next: AiTab) => void setState({ tab: next === "chat" ? null : next }),
    openChat: (id: number | null) => void setState({ tab: null, chat: id }),
  };
};
