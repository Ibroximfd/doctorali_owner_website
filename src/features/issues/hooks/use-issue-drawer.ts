"use client";

import { parseAsBoolean, parseAsInteger, useQueryStates } from "nuqs";

/**
 * Muammo kartasi `?issue=<id>` orqali ochiladi (havola ulashiladi, masalan Telegram xulosasidan).
 * `&compose=true` — karta xabar yozish oynasi ochiq holda ochiladi.
 */
export const useIssueDrawer = () => {
  const [{ issue: issueId, compose }, setState] = useQueryStates(
    { issue: parseAsInteger, compose: parseAsBoolean.withDefault(false) },
    { history: "push" },
  );
  return {
    issueId,
    isComposing: compose,
    openIssue: (id: number, withCompose = false) =>
      void setState({ issue: id, compose: withCompose || null }),
    setComposing: (value: boolean) => void setState({ compose: value || null }),
    closeIssue: () => void setState({ issue: null, compose: null }),
  };
};
