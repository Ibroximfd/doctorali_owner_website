"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { toAppError } from "@/shared/lib/app-error";

import { useDecideAction } from "../hooks/use-ai";

export type ActionDecision = "approve" | "reject" | "undo";

/** AI amalini tasdiqlash / rad etish / bekor qilish — natija toast bilan aytiladi (panel va yon ustunda bir xil). */
export const useActionDecision = () => {
  const t = useTranslations("ai.actions");
  const decide = useDecideAction();

  const run = (id: number, decision: ActionDecision) =>
    decide.mutate(
      { id, decision },
      {
        onSuccess: () => toast.success(t(`toast.${decision}`)),
        onError: (error) => {
          const code = toAppError(error).code;
          toast.error(
            code === "action_stale" ? t("stale") : code === "undo_expired" ? t("undoExpired") : t("failed"),
          );
        },
      },
    );

  return { run, isPending: decide.isPending };
};
