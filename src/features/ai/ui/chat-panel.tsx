"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, CalendarCheck, Clock4, History, Plus, Smartphone, UsersRound, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { toAppError } from "@/shared/lib/app-error";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { BlockSkeleton, QueryState } from "@/shared/ui/states";

import { useChatQuery, useChatsQuery, useCreateChat, useSendChatMessage } from "../hooks/use-ai";
import { useAiTab } from "../hooks/use-ai-tab";
import { MESSAGE_MAX, hasPendingReply } from "../model/ai.rules";
import type { ChatMessage } from "../model/ai.schema";
import { AiAvatar, AiOrb } from "./ai-orb";
import { AnswerParts, AttachmentCard, ChatBlocks } from "./chat-blocks";

/** Tayyor savollar (boshliq eng ko'p so'raydiganlari). */
const STARTERS = [
  { key: "daily", icon: CalendarCheck },
  { key: "app", icon: Smartphone },
  { key: "operators", icon: UsersRound },
  { key: "cash", icon: Wallet },
] as const;

/** «Bosh» — AI chat: tarix tepada chiplar qatorida, suhbat bitta katta kartada. Savol → AI vositalar bilan raqam oladi → javob, jadval, fayl. */
export const ChatPanel = () => {
  const t = useTranslations("ai.chat");
  const { chatId, openChat } = useAiTab();
  const chat = useChatQuery(chatId);
  const createChat = useCreateChat();
  const send = useSendChatMessage();
  const isPending = hasPendingReply(chat.data) || send.isPending || createChat.isPending;

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || isPending) return;
    try {
      const id = chatId ?? (await createChat.mutateAsync()).id;
      if (chatId === null) openChat(id);
      await send.mutateAsync({ chatId: id, text: question });
    } catch (error) {
      const kind = toAppError(error).kind;
      toast.error(t(kind === "rate-limited" ? "limit" : kind === "forbidden" ? "forbidden" : "failed"));
    }
  };

  return (
    <section
      aria-label={t("conversation")}
      className="panel-surface relative flex min-h-136 flex-col overflow-hidden rounded-4xl border"
    >
      <ChatHistory />
      {chatId === null ? (
        <ChatWelcome onPick={(text) => void ask(text)} disabled={isPending} />
      ) : (
        <QueryState
          query={chat}
          className="flex flex-1 flex-col"
          skeleton={<BlockSkeleton className="m-6 h-64" />}
        >
          {(data) => <Conversation messages={data.messages} onSuggest={(text) => void ask(text)} />}
        </QueryState>
      )}
      <Composer onSend={(text) => void ask(text)} disabled={isPending} />
    </section>
  );
};

/** Suhbatlar tarixi — yuqorida ixcham chiplar qatori (gorizontal aylantiriladi) va «Yangi». */
const ChatHistory = () => {
  const t = useTranslations("ai.chat");
  const { openChat } = useAiTab();
  const chats = useChatsQuery();
  return (
    <nav aria-label={t("history")} className="flex items-center gap-2 border-b px-4 py-3 md:px-6">
      <History aria-hidden className="text-ink-3 size-4 shrink-0" />
      <div className="fade-mask-x min-w-0 flex-1 overflow-x-auto">
        <QueryState query={chats} skeleton={<div className="skeleton h-8 w-48" />}>
          {(list) =>
            list.length === 0 ? (
              <p className="text-ink-3 px-2 text-xs">{t("noHistory")}</p>
            ) : (
              <ul className="flex gap-1.5 px-2">
                {list.map((item) => (
                  <ChatHistoryItem key={item.id} id={item.id} title={item.title} updatedAt={item.updatedAt} />
                ))}
              </ul>
            )
          }
        </QueryState>
      </div>
      <Button size="sm" intent="ghost" className="shrink-0 rounded-full" onClick={() => openChat(null)}>
        <Plus aria-hidden />
        {t("new")}
      </Button>
    </nav>
  );
};

const ChatHistoryItem = ({ id, title, updatedAt }: { id: number; title: string; updatedAt: string }) => {
  const { chatId, openChat } = useAiTab();
  const relative = useRelativeTime();
  const isActive = chatId === id;
  return (
    <li className="shrink-0">
      <button
        type="button"
        aria-current={isActive ? "true" : undefined}
        onClick={() => openChat(id)}
        className={cn(
          "flex h-8 max-w-56 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
          isActive ? "border-accent/40 bg-accent/14 text-ink font-semibold" : "text-ink-2 hover:text-ink",
        )}
      >
        <span className="truncate">{title}</span>
        <span className="text-ink-3 inline-flex shrink-0 items-center gap-1">
          <Clock4 aria-hidden className="size-3" />
          {relative(updatedAt)}
        </span>
      </button>
    </li>
  );
};

/** Bo'sh suhbat: katta tirik shar, salomlashuv va tayyor savollar. */
const ChatWelcome = ({ onPick, disabled }: { onPick: (text: string) => void; disabled: boolean }) => {
  const t = useTranslations("ai.chat");
  const reduce = useReducedMotion();
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-5 px-5 py-10 text-center">
      <motion.div
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 18 }}
        className="relative size-28"
      >
        <AiOrb className="size-full" />
      </motion.div>
      <div className="relative">
        <h2 className="font-display text-3xl">{t("welcomeTitle")}</h2>
        <p className="text-ink-2 text-md mx-auto mt-2 max-w-md">{t("welcomeText")}</p>
      </div>
      <ul className="relative grid w-full max-w-2xl gap-2 sm:grid-cols-2">
        {STARTERS.map(({ key, icon: Icon }, index) => (
          <motion.li
            key={key}
            initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.2 + index * 0.07 }}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(t(`starters.${key}.prompt`))}
              className="bg-surface-2/60 hover:border-gold/50 hover:bg-surface-3 flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors disabled:opacity-60"
            >
              <span className="bg-gold/15 text-gold grid size-9 shrink-0 place-items-center rounded-xl">
                <Icon aria-hidden className="size-4.5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{t(`starters.${key}.title`)}</span>
                <span className="text-ink-3 block text-xs">{t(`starters.${key}.hint`)}</span>
              </span>
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
};

const Conversation = ({
  messages,
  onSuggest,
}: {
  messages: readonly ChatMessage[];
  onSuggest: (text: string) => void;
}) => {
  const endRef = useRef<HTMLDivElement>(null);
  const last = messages.at(-1);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, last?.status]);

  return (
    <div aria-live="polite" className="flex max-h-192 flex-1 flex-col gap-5.5 overflow-y-auto p-4 md:p-6.5">
      <AnimatePresence initial={false}>
        {messages.map((message) =>
          message.role === "user" ? (
            <UserBubble key={message.id} text={message.text} />
          ) : (
            <AssistantMessage
              key={message.id}
              message={message}
              onSuggest={message === last ? onSuggest : undefined}
            />
          ),
        )}
      </AnimatePresence>
      <div ref={endRef} />
    </div>
  );
};

/** Kirish: pastdan ko'tarilib, xiralikdan aniq bo'ladi. */
const useEnter = (delay = 0) => {
  const reduce = useReducedMotion();
  return {
    initial: reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.7, ease: EASE_OUT, delay },
  } as const;
};

/** Boshliq savoli — o'ngda, och (teskari) pufakcha. */
const UserBubble = ({ text }: { text: string }) => (
  <motion.div
    {...useEnter()}
    className="bg-ink text-bg text-md max-w-xl self-end rounded-3xl rounded-br-md px-4.5 py-3.5 leading-relaxed whitespace-pre-line"
  >
    {text}
  </motion.div>
);

const AssistantMessage = ({
  message,
  onSuggest,
}: {
  message: ChatMessage;
  onSuggest?: (text: string) => void;
}) => {
  const t = useTranslations("ai.chat");
  const enter = useEnter(0.1);
  const isPending = message.status === "pending";

  if (isPending) {
    return (
      <motion.div {...enter} className="flex items-center gap-3.5">
        <AiAvatar thinking />
        <ThinkingLine label={t("thinking")} status={t("thinkingStatus")} />
      </motion.div>
    );
  }

  return (
    <motion.div {...enter} className="flex gap-3.5">
      <AiAvatar />
      <div className="min-w-0 flex-1">
        {message.status === "failed" ? (
          <p className="text-crit text-sm">{t("replyFailed")}</p>
        ) : (
          <>
            <AnswerParts blocks={message.blocks} attachments={message.attachments} />
            <p className="font-display text-xl leading-snug whitespace-pre-line">{message.text}</p>
            <ChatBlocks blocks={message.blocks} />
            {message.attachments.map((attachment) => (
              <AttachmentCard key={attachment.id} attachment={attachment} />
            ))}
          </>
        )}
        {onSuggest && message.suggestions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggest(suggestion)}
                className="border-border-strong text-ink hover:bg-surface-3 hover:border-accent/40 h-8.5 rounded-full border px-3.5 text-sm font-medium transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};

/** «O'ylayapti»: matn sekin pulsatsiya qiladi, ostida shimmer chiziqlar (gradient matn emas). */
const ThinkingLine = ({ label, status }: { label: string; status: string }) => {
  const reduce = useReducedMotion();
  return (
    <div role="status" aria-label={status} className="flex min-w-0 flex-1 flex-col gap-2">
      <motion.span
        className="text-ink-2 text-sm"
        animate={reduce ? undefined : { opacity: [0.45, 1, 0.45] }}
        transition={reduce ? undefined : { duration: 2.2, ease: "easeInOut", repeat: Infinity }}
      >
        {label}…
      </motion.span>
      <span aria-hidden className="flex flex-col gap-1.5">
        <span className="skeleton h-2 w-3/4 max-w-sm" />
        <span className="skeleton h-2 w-1/2 max-w-60" />
      </span>
    </div>
  );
};

/** Savol maydoni: Enter — yuborish, Shift+Enter — yangi qator. Ovozli savol vebda yo'q — faqat matn. */
const Composer = ({ onSend, disabled }: { onSend: (text: string) => void; disabled: boolean }) => {
  const t = useTranslations("ai.chat");
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="px-4 pb-4 md:px-6.5 md:pb-6.5"
    >
      <div className="border-border-strong bg-bg/70 shadow-glow focus-within:border-accent/60 flex items-end gap-2.5 rounded-3xl border p-2 pl-4.5 shadow-xl transition-colors">
        <label htmlFor="ai-question" className="sr-only">
          {t("placeholder")}
        </label>
        <textarea
          id="ai-question"
          rows={1}
          value={text}
          maxLength={MESSAGE_MAX}
          placeholder={t("placeholder")}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          className="text-md placeholder:text-ink-3 field-sizing-content max-h-40 min-h-11 flex-1 resize-none bg-transparent py-3 outline-none"
        />
        <button
          type="submit"
          aria-label={t("send")}
          disabled={disabled || !text.trim()}
          className="bg-accent text-accent-ink grid size-11 shrink-0 place-items-center rounded-2xl transition hover:brightness-110 disabled:opacity-50"
        >
          <ArrowUp aria-hidden className="size-4.5" />
        </button>
      </div>
      <p className="text-2xs text-ink-3 mt-2 text-center">{t("disclaimer")}</p>
    </form>
  );
};
