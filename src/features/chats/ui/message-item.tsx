"use client";

import { Check, CheckCheck, FileText, Link2, Reply } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { Pill } from "@/shared/ui/pill";

import { fileKindOf, imageSrc, isFileKind, mediaHref, type FileKind } from "../model/chats.rules";
import type { ChatMessage } from "../model/chats.schema";

const KB = 1024;
const sizeLabel = (bytes: number | null): string | null => {
  if (bytes === null) return null;
  return bytes >= KB * KB
    ? `${(bytes / KB / KB).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / KB))} KB`;
};

type MessageItemProps = {
  message: ChatMessage;
  /** `null` — javob berish yo'q (ko'ruvchi). */
  onReply: ((message: ChatMessage) => void) | null;
};

/** Bitta xabar: o'zimniki o'ngda (o'qildi belgisi bilan), rahbarniki chapda — ism bilan. */
export const MessageItem = ({ message, onReply }: MessageItemProps) => {
  const t = useTranslations("chats.conversation");
  const format = useFormat();
  const mine = message.isMine;

  return (
    <li className={cn("group flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      {!mine && message.sender?.fullName ? (
        <span className="text-ink-3 px-1 text-xs">{message.sender.fullName}</span>
      ) : null}
      <div
        className={cn(
          "max-w-full rounded-2xl px-3.5 py-2.5 text-sm sm:max-w-md",
          mine ? "bg-accent-soft text-ink" : "bg-surface border",
        )}
      >
        {message.isDeleted ? (
          <p className="text-ink-3 italic">{t("deleted")}</p>
        ) : (
          <>
            {message.replyTo ? (
              <p className="text-ink-3 mb-1.5 border-l-2 pl-2 text-xs">
                {t("replyTo", { name: message.replyTo.senderName ?? t("replyFallback") })}
                {message.replyTo.text ? <span className="block truncate">{message.replyTo.text}</span> : null}
              </p>
            ) : null}
            {message.text ? <p className="break-words whitespace-pre-wrap">{message.text}</p> : null}
            <Attachment message={message} />
            <RefChip message={message} />
          </>
        )}
      </div>
      <div className="text-2xs text-ink-3 flex items-center gap-1.5 px-1">
        <span className="num">{format.dateTime(message.createdAt)}</span>
        {message.editedAt ? <span>· {t("edited")}</span> : null}
        {mine ? (
          message.isRead ? (
            <span className="text-accent flex items-center gap-0.5">
              <CheckCheck aria-hidden className="size-3.5" />
              {t("read")}
            </span>
          ) : (
            <span className="flex items-center gap-0.5">
              <Check aria-hidden className="size-3.5" />
              {t("sent")}
            </span>
          )
        ) : null}
        {onReply && !message.isDeleted ? (
          <button
            type="button"
            onClick={() => onReply(message)}
            className="hover:text-ink flex items-center gap-0.5 rounded-sm"
          >
            <Reply aria-hidden className="size-3.5" />
            {t("reply")}
          </button>
        ) : null}
      </div>
    </li>
  );
};

const Attachment = ({ message }: { message: ChatMessage }) => {
  const t = useTranslations("chats");
  const file = message.file;
  if (!file) return null;
  const kind: FileKind = isFileKind(file.kind) ? file.kind : fileKindOf(file.mime);
  const image = kind === "image" ? imageSrc(file.url) : null;
  const href = mediaHref(file.url);
  const name = file.name ?? t(`fileKinds.${kind}`);

  if (image)
    return (
      <a href={image} target="_blank" rel="noreferrer" className="mt-2 block">
        {/* eslint-disable-next-line @next/next/no-img-element -- backend media proksi orqali, o'lchami noma'lum */}
        <img src={image} alt={name} className="max-h-64 rounded-xl border object-cover" loading="lazy" />
      </a>
    );

  const size = sizeLabel(file.size);
  const body = (
    <>
      <FileText aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{name}</span>
      {size ? <span className="num text-ink-3 shrink-0 text-xs">{size}</span> : null}
    </>
  );
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${t("conversation.openFile")}: ${name}`}
      className="bg-surface-2 hover:bg-surface-3 mt-2 flex items-center gap-2 rounded-xl border px-3 py-2"
    >
      {body}
    </a>
  ) : (
    <div className="bg-surface-2 mt-2 flex items-center gap-2 rounded-xl border px-3 py-2">
      {body}
      <span className="text-ink-3 text-xs">· {t("conversation.fileNoLink")}</span>
    </div>
  );
};

/** Zakaz/lid havolasi — mavjud bo'lmasa ham ko'rinadi (tarixdan yo'qolmasin). */
const RefChip = ({ message }: { message: ChatMessage }) => {
  const t = useTranslations("chats.conversation");
  const ref = message.ref;
  if (!ref) return null;
  const type = ref.type === "lead" ? t("refLead") : t("refOrder");
  return (
    <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
      <Pill intent={ref.exists ? "info" : "warn"} icon={Link2}>
        {type} {ref.label ?? `#${ref.id}`}
      </Pill>
      {ref.exists ? null : <span className="text-warn">{t("refMissing")}</span>}
    </span>
  );
};
