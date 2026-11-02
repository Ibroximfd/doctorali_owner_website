"use client";

import { FileText, Send, ShieldCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { useFormat } from "@/shared/hooks/use-format";
import { toAppError } from "@/shared/lib/app-error";
import { useCanAct } from "@/shared/stores/session-store";
import { Banner } from "@/shared/ui/banner";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Pill } from "@/shared/ui/pill";
import { Segmented } from "@/shared/ui/segmented";
import { ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useDiscardDraft, useDraftsQuery, useSendDraft } from "../hooks/use-ai";
import { useDraftStatus } from "../hooks/use-ai-tab";
import { draftFailure, ownerRoleOf } from "../model/ai.rules";
import { DRAFT_STATUSES, type AiDraft } from "../model/ai.schema";

type Action = { kind: "send" | "discard"; draft: AiDraft };

/**
 * AI loyihalari (TZ 32 §C-2): AI kamchilikni topsa filial rahbariga xabar LOYIHASINI yozadi.
 * Loyiha o'zi ketmaydi — faqat boshliq «Yuborish» ni tasdiqlaganda (`POST …/send/`) tegishli
 * kanalga tushadi; «Rad etish» — `DELETE …/send/`.
 */
export const DraftsPanel = () => {
  const t = useTranslations("ai.drafts");
  const canAct = useCanAct();
  const { status, setStatus } = useDraftStatus();
  const query = useDraftsQuery(status);
  const [action, setAction] = useState<Action | null>(null);
  const send = useSendDraft();
  const discard = useDiscardDraft();
  const running = action?.kind === "send" ? send : discard;

  const confirm = () => {
    if (!action) return;
    running.mutate(action.draft.id, {
      onSuccess: () => {
        toast.success(t(action.kind === "send" ? "sent" : "discarded"));
        setAction(null);
      },
      onError: (error) => {
        const failure = draftFailure(toAppError(error));
        // allaqachon yuborilgan / rad etilgan — ro'yxat yangilandi, oyna yopiladi
        if (failure === "alreadySent" || failure === "discarded") {
          toast.message(t(`errors.${failure}`));
          setAction(null);
        }
      },
    });
  };

  const failure = running.error ? draftFailure(toAppError(running.error)) : null;
  /** «Toshkent · Bosh logist» — kimga ketishi tasdiq oynasida yoziladi. */
  const recipientOf = (draft: AiDraft): string => {
    const role = ownerRoleOf(draft.ownerRole);
    const roleLabel = role ? t(`roles.${role}`) : t("roles.unknown");
    return draft.filial ? `${draft.filial.name} · ${roleLabel}` : roleLabel;
  };

  return (
    <section aria-labelledby="ai-drafts-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <h2 id="ai-drafts-title" className="font-strong text-lg">
            {t("title")}
          </h2>
          <p className="text-ink-3 text-xs">{t("description")}</p>
        </div>
        <Segmented
          className="sm:ml-auto"
          ariaLabel={t("statusLabel")}
          value={status}
          onChange={setStatus}
          options={DRAFT_STATUSES.map((value) => ({ value, label: t(`statuses.${value}`) }))}
        />
      </div>
      <Banner icon={ShieldCheck}>{t("safety")}</Banner>
      <QueryState
        query={query}
        skeleton={<ListSkeleton rows={3} />}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <StateBlock icon={FileText} title={t(`empty.${status}`)} description={t("emptyDescription")} />
        }
      >
        {(rows) => (
          <ul className="flex flex-col gap-2.5">
            {rows.map((draft) => (
              <DraftItem
                key={draft.id}
                draft={draft}
                canAct={canAct && draft.status === "draft"}
                onSend={() => setAction({ kind: "send", draft })}
                onDiscard={() => setAction({ kind: "discard", draft })}
              />
            ))}
          </ul>
        )}
      </QueryState>
      <ConfirmDialog
        open={action !== null}
        onOpenChange={(open) => {
          if (open) return;
          running.reset();
          setAction(null);
        }}
        title={t(action?.kind === "discard" ? "discardTitle" : "sendTitle")}
        description={
          action?.kind === "discard"
            ? t("discardDescription")
            : t("sendDescription", { recipient: action ? recipientOf(action.draft) : "" })
        }
        confirmLabel={t(action?.kind === "discard" ? "discardConfirm" : "sendConfirm")}
        pendingLabel={t("pending")}
        isPending={running.isPending}
        error={
          failure && failure !== "alreadySent" && failure !== "discarded" ? t(`errors.${failure}`) : undefined
        }
        onConfirm={confirm}
      />
    </section>
  );
};

const DraftItem = ({
  draft,
  canAct,
  onSend,
  onDiscard,
}: {
  draft: AiDraft;
  canAct: boolean;
  onSend: () => void;
  onDiscard: () => void;
}) => {
  const t = useTranslations("ai.drafts");
  const format = useFormat();
  const role = ownerRoleOf(draft.ownerRole);
  return (
    <li className="bg-surface rounded-2xl border px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {draft.filial ? <Pill intent="neutral">{draft.filial.name}</Pill> : null}
        <Pill intent="info">{role ? t(`roles.${role}`) : t("roles.unknown")}</Pill>
        <Pill intent={draft.status === "sent" ? "good" : draft.status === "discarded" ? "neutral" : "warn"}>
          {t.has(`statuses.${draft.status}`) ? t(`statuses.${draft.status}`) : draft.status}
        </Pill>
        {draft.createdAt ? (
          <span className="text-2xs text-ink-3 ms-auto">
            {format.dateTime(draft.sentAt ?? draft.createdAt)}
          </span>
        ) : null}
      </div>
      <p className="text-ink mt-2 text-sm whitespace-pre-line">{draft.text}</p>
      {canAct ? (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button size="sm" intent="ghost" onClick={onDiscard}>
            <X aria-hidden />
            {t("discard")}
          </Button>
          <Button size="sm" intent="primary" onClick={onSend}>
            <Send aria-hidden />
            {t("send")}
          </Button>
        </div>
      ) : null}
    </li>
  );
};
