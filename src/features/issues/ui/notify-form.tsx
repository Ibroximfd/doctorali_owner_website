"use client";

import { motion, useReducedMotion } from "motion/react";
import { MessageCircle, Send, Smartphone, MessageSquareText, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { toAppError } from "@/shared/lib/app-error";
import { cn } from "@/shared/lib/cn";
import { formatPhone } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import { Field } from "@/shared/ui/input";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Segmented } from "@/shared/ui/segmented";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useNotifyIssue, useRecipientsQuery } from "../hooks/use-issues";
import {
  MESSAGE_MAX,
  availableChannels,
  defaultMessage,
  isNotifyChannel,
  type NotifyChannel,
} from "../model/issues.rules";
import type { IssueDetail, Recipient } from "../model/issues.schema";

const CHANNEL_ICON: Record<NotifyChannel, LucideIcon> = {
  telegram: Send,
  sms: MessageSquareText,
  app: Smartphone,
};

type NotifyFormProps = {
  issue: IssueDetail;
  onDone: () => void;
  /** `?compose=true` havolasi bilan ochilganda matn maydoni darhol fokusda. */
  autoFocus?: boolean;
  /** Yuborish tugmasi yonidagi qo'shimcha amal (masalan «AI'dan so'rash»). */
  aside?: ReactNode;
};

/**
 * Mas'ulga xabar: qabul qiluvchi (default — muammo mas'uli), kanallar, shoshilinchlik
 * va tayyor matn (tahrirlanadi). Yuborilgach har kanal natijasi toast da ko'rinadi.
 * Kompozer muammo paneli ichida doim ochiq turadi.
 */
export const NotifyForm = ({ issue, onDone, autoFocus = false, aside }: NotifyFormProps) => {
  const t = useTranslations("issues.notify");
  const recipients = useRecipientsQuery(issue.domain, true);

  return (
    <QueryState query={recipients} skeleton={<ListSkeleton rows={3} />}>
      {(list) => (
        <NotifyFields
          issue={issue}
          recipients={withResponsible(list, issue)}
          onDone={onDone}
          autoFocus={autoFocus}
          aside={aside}
          t={t}
        />
      )}
    </QueryState>
  );
};

/** Mas'ul ro'yxatda bo'lmasa ham birinchi o'rinda turadi. */
const withResponsible = (list: readonly Recipient[], issue: IssueDetail): Recipient[] => {
  const responsible = issue.responsible;
  if (!responsible) return [...list];
  const rest = list.filter((person) => person.id !== responsible.id);
  const own = list.find((person) => person.id === responsible.id) ?? { ...responsible, filial: issue.filial };
  return [own, ...rest];
};

const NotifyFields = ({
  issue,
  recipients,
  onDone,
  autoFocus,
  aside,
  t,
}: NotifyFormProps & { recipients: Recipient[]; t: ReturnType<typeof useTranslations<"issues.notify">> }) => {
  const reduce = useReducedMotion();
  const notify = useNotifyIssue(issue.id);
  const first = recipients[0] ?? null;
  const [recipientId, setRecipientId] = useState<number | null>(first?.id ?? null);
  const recipient = recipients.find((person) => person.id === recipientId) ?? null;
  const channelsFor = (person: Recipient | null) => (person ? availableChannels(person.channels) : []);
  const [channels, setChannels] = useState<NotifyChannel[]>(() => channelsFor(first).slice(0, 1));
  const [urgency, setUrgency] = useState<"normal" | "urgent">(
    issue.severity === "critical" ? "urgent" : "normal",
  );
  const [message, setMessage] = useState(() =>
    defaultMessage((values) => t("template", values), issue, first?.fullName ?? null),
  );

  const pickRecipient = (person: Recipient) => {
    setRecipientId(person.id);
    setChannels(channelsFor(person).slice(0, 1));
    setMessage(defaultMessage((values) => t("template", values), issue, person.fullName));
  };

  const toggleChannel = (channel: NotifyChannel) =>
    setChannels((current) =>
      current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel],
    );

  const trimmed = message.trim();
  const canSend = recipient !== null && channels.length > 0 && trimmed.length > 0 && !notify.isPending;

  const send = () => {
    if (!canSend || recipient === null) return;
    notify.mutate(
      { recipientId: recipient.id, channels, urgency, message: trimmed },
      {
        onSuccess: (result) => {
          const failed = result.results
            .filter((item) => item.status === "failed")
            .map((item) => item.channel);
          if (failed.length > 0) toast.warning(t("partial", { channels: failed.join(", ") }));
          else toast.success(t("sent", { name: recipient.fullName }));
          onDone();
        },
        onError: (error) => {
          const appError = toAppError(error);
          if (appError.kind === "forbidden") toast.error(t("forbidden"));
          else if (appError.kind === "rate-limited") toast.error(t("throttled"));
          else toast.error(t("failed"));
        },
      },
    );
  };

  if (recipients.length === 0) return <p className="text-ink-3 text-sm">{t("noRecipients")}</p>;

  return (
    <motion.form
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
      className="bg-bg/60 flex flex-col gap-3.5 rounded-2xl border p-3.5"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-ink-3 mb-2 text-xs">
          {t("heading", {
            channels:
              channels.length > 0 ? channels.map((channel) => t(`channel.${channel}`)).join(" + ") : "—",
          })}
        </legend>
        <ul aria-label={t("recipient")} className="flex flex-wrap gap-1.5">
          {recipients.map((person, index) => {
            const isPicked = person.id === recipientId;
            return (
              <li key={person.id} className="min-w-0">
                <button
                  type="button"
                  aria-pressed={isPicked}
                  title={[person.role, person.filial, person.phone ? formatPhone(person.phone) : null]
                    .filter(Boolean)
                    .join(" · ")}
                  onClick={() => pickRecipient(person)}
                  className={cn(
                    "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs transition-colors",
                    isPicked
                      ? "border-accent/40 bg-accent-soft text-accent font-bold"
                      : "text-ink-2 hover:text-ink bg-surface-2/60",
                  )}
                >
                  <span className="truncate">
                    {person.fullName}
                    <span className="font-normal"> · {person.role}</span>
                  </span>
                  {index === 0 && issue.responsible ? (
                    <span className="text-2xs shrink-0 font-semibold">{t("responsibleTag")}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label={t("channels")} className="flex flex-wrap gap-1.5">
          {(recipient?.channels ?? []).filter(isNotifyChannel).map((channel) => {
            const Icon = CHANNEL_ICON[channel];
            return (
              <Chip key={channel} pressed={channels.includes(channel)} onClick={() => toggleChannel(channel)}>
                <Icon aria-hidden className="size-3.5" />
                {t(`channel.${channel}`)}
              </Chip>
            );
          })}
        </div>
        <Segmented
          ariaLabel={t("urgency")}
          value={urgency}
          onChange={setUrgency}
          options={[
            { value: "normal", label: t("normal") },
            { value: "urgent", label: t("urgent") },
          ]}
        />
      </div>

      <Field id={`issue-message-${issue.id}`} label={t("message")}>
        <textarea
          id={`issue-message-${issue.id}`}
          value={message}
          maxLength={MESSAGE_MAX}
          rows={4}
          autoFocus={autoFocus}
          onChange={(event) => setMessage(event.target.value)}
          className="border-border-strong bg-surface focus-visible:border-accent focus-visible:ring-accent/25 w-full resize-y rounded-xl border px-3 py-2 text-base leading-relaxed focus-visible:ring-3 focus-visible:outline-none"
        />
        <span className="text-2xs text-ink-3 num self-end">
          {message.length} / {MESSAGE_MAX}
        </span>
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          intent={issue.severity === "critical" ? "danger" : "primary"}
          disabled={!canSend}
          className="flex-1"
        >
          <MessageCircle aria-hidden />
          {notify.isPending ? t("sending") : t("send")}
        </Button>
        {aside}
      </div>
    </motion.form>
  );
};
