"use client";

import { Link2, Paperclip, SendHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { toAppError } from "@/shared/lib/app-error";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Input, Select } from "@/shared/ui/input";

import { useSendMessage } from "../hooks/use-chats";
import {
  draftProblem,
  fileKindOf,
  fileLimitMb,
  sendErrorKey,
  TEXT_MAX,
  type DraftProblem,
} from "../model/chats.rules";
import { REF_TYPES, type ChatMessage, type Draft, type RefType } from "../model/chats.schema";

type ComposerProps = {
  channelId: number;
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
};

/**
 * Xabar yozish: matn (8000 gacha), bitta fayl (turiga qarab hajm chegarasi), zakaz/lid havolasi,
 * javob. Yuborish kutilayotganda tugma bloklangan — ikki marta ketmaydi.
 */
export const Composer = ({ channelId, replyTo, onCancelReply }: ComposerProps) => {
  const t = useTranslations("chats");
  const send = useSendMessage(channelId);
  const sending = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [ref, setRef] = useState<{ type: RefType; id: string } | null>(null);
  const [problem, setProblem] = useState<DraftProblem>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const reset = () => {
    setText("");
    setFile(null);
    setRef(null);
    setProblem(null);
    if (fileInput.current) fileInput.current.value = "";
    onCancelReply();
  };

  const submit = () => {
    if (sending.current || send.isPending) return;
    const draft: Draft = { text, file, ref, replyTo: replyTo?.id ?? null };
    const found = draftProblem(draft);
    setProblem(found);
    setFailure(null);
    if (found) return;
    sending.current = true;
    send.mutate(
      { channelId, draft },
      {
        onSettled: () => {
          sending.current = false;
        },
        onSuccess: reset,
        onError: (error) => setFailure(sendErrorKey(toAppError(error).code)),
      },
    );
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const problemText =
    problem === "fileTooLarge" && file
      ? t("composer.problems.fileTooLarge", { limit: fileLimitMb(fileKindOf(file.type)) })
      : problem
        ? t(`composer.problems.${problem}`)
        : null;
  const nearLimit = text.length > TEXT_MAX - 200;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 border-t px-4 py-3 md:px-5" noValidate>
      {replyTo ? (
        <div className="bg-surface-2 flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs">
          <span className="text-ink-2 min-w-0 flex-1 truncate">
            {t("conversation.replyTo", {
              name: replyTo.isMine
                ? t("conversation.you")
                : (replyTo.sender?.fullName ?? t("conversation.replyFallback")),
            })}
            {replyTo.text ? ` — ${replyTo.text}` : null}
          </span>
          <Button size="icon" intent="ghost" aria-label={t("composer.cancelReply")} onClick={onCancelReply}>
            <X aria-hidden />
          </Button>
        </div>
      ) : null}

      {ref ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="sr-only" htmlFor="chat-ref-type">
            {t("composer.refType")}
          </label>
          <Select
            id="chat-ref-type"
            className="h-9 w-auto text-sm"
            value={ref.type}
            onChange={(event) =>
              setRef({ ...ref, type: REF_TYPES.find((type) => type === event.target.value) ?? "order" })
            }
          >
            {REF_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === "lead" ? t("conversation.refLead") : t("conversation.refOrder")}
              </option>
            ))}
          </Select>
          <label className="sr-only" htmlFor="chat-ref-id">
            {t("composer.refId")}
          </label>
          <Input
            id="chat-ref-id"
            className="h-9 min-w-0 flex-1 text-sm"
            value={ref.id}
            placeholder={t("composer.refIdPlaceholder")}
            aria-invalid={problem === "refId"}
            onChange={(event) => setRef({ ...ref, id: event.target.value })}
          />
          <Button
            size="icon"
            intent="ghost"
            aria-label={t("composer.removeRef")}
            onClick={() => setRef(null)}
          >
            <X aria-hidden />
          </Button>
        </div>
      ) : null}

      {file ? (
        <div className="bg-surface-2 flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs">
          <Paperclip aria-hidden className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {t(`fileKinds.${fileKindOf(file.type)}`)} · {file.name}
          </span>
          <Button
            size="icon"
            intent="ghost"
            aria-label={t("composer.removeFile")}
            onClick={() => {
              setFile(null);
              if (fileInput.current) fileInput.current.value = "";
            }}
          >
            <X aria-hidden />
          </Button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <input
          ref={fileInput}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setProblem(null);
          }}
        />
        <Button
          size="icon"
          intent="ghost"
          aria-label={t("composer.attach")}
          disabled={send.isPending}
          onClick={() => fileInput.current?.click()}
        >
          <Paperclip aria-hidden />
        </Button>
        <Button
          size="icon"
          intent="ghost"
          aria-label={t("composer.addRef")}
          aria-pressed={ref !== null}
          disabled={send.isPending}
          onClick={() => setRef(ref ?? { type: "order", id: "" })}
        >
          <Link2 aria-hidden />
        </Button>
        <label htmlFor="chat-text" className="sr-only">
          {t("composer.label")}
        </label>
        <textarea
          id="chat-text"
          rows={2}
          maxLength={TEXT_MAX}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("composer.placeholder")}
          aria-invalid={problem === "empty" || problem === "tooLong"}
          aria-describedby="chat-text-hint"
          className={cn(
            "border-border-strong bg-surface/60 placeholder:text-ink-3 min-h-11 w-full min-w-0 resize-none rounded-xl border px-3.5 py-2.5 text-base",
            "focus-visible:border-accent focus-visible:ring-accent/25 focus-visible:ring-3 focus-visible:outline-none",
          )}
        />
        <Button
          type="submit"
          intent="primary"
          size="icon"
          aria-label={send.isPending ? t("composer.sending") : t("composer.send")}
          aria-busy={send.isPending}
          disabled={send.isPending}
        >
          <SendHorizontal aria-hidden />
        </Button>
      </div>
      <p id="chat-text-hint" className="text-2xs text-ink-3" aria-live="polite">
        {problemText ? (
          <span role="alert" className="text-crit">
            {problemText}
          </span>
        ) : failure ? (
          <span role="alert" className="text-crit">
            {t(`errors.${failure}`)}
          </span>
        ) : send.isPending ? (
          t("composer.sending")
        ) : nearLimit ? (
          t("composer.charsLeft", { count: TEXT_MAX - text.length })
        ) : (
          t("composer.hint")
        )}
      </p>
    </form>
  );
};
