"use client";

import { ArrowLeft, ArrowUp, MessageSquarePlus, MessagesSquare, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { useFormat } from "@/shared/hooks/use-format";
import { isMissingEndpoint, toAppError } from "@/shared/lib/app-error";
import { cn } from "@/shared/lib/cn";
import { useCanAct } from "@/shared/stores/session-store";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import {
  useAiStatusQuery,
  useChatsQuery,
  useCreateChat,
  useDeleteChat,
  useMessagesQuery,
  useSendMessage,
} from "../hooks/use-ai";
import { useSelectedChat } from "../hooks/use-ai-tab";
import {
  chatFailure,
  lastMessageId,
  mergeMessagePages,
  MESSAGE_MAX,
  MESSAGE_MIN,
  type ChatFailure,
} from "../model/ai.rules";
import type { AiChat, AiMessage } from "../model/ai.schema";
import { AiAnswer } from "./ai-answer";
import { AiAvatar } from "./ai-orb";
import { LegacyChatPanel, STARTERS } from "./legacy-chat-panel";

/**
 * Javob kutilayotgan (yoki yuborilmay qolgan) savol — server uni javob bilan birga saqlaydi.
 * `checking` — so'rov uzildi, server tarixidan javob qidirilmoqda (hujjat 56).
 */
type Pending = {
  chatId: number;
  text: string;
  afterId: number | null;
  startedAt: number;
  checking: boolean;
  error: ChatFailure | null;
};

/**
 * AI chat (TZ 32 §I-3): suhbatlar ro'yxati, yangi suhbat (AI chaqirilmaydi), o'chirish, tarix
 * (`before_id` bilan yuqoriga) va yuborish — HAR xabar bitta chaqiruv, javob oqimsiz keladi.
 * Kalitsiz rejimda tarix ko'rinadi, yozish o'chiq. Backendda `ai/chats/` hali yo'q bo'lsa
 * (eski prod) — tarixsiz eski chat.
 */
export const ChatsPanel = () => {
  const t = useTranslations("ai.chat");
  const chats = useChatsQuery();
  const { chatId } = useSelectedChat();

  if (chats.data === undefined && chats.error && isMissingEndpoint(toAppError(chats.error)))
    return <LegacyChatPanel />;

  return (
    <section
      aria-label={t("conversation")}
      className="panel-surface grid min-h-96 overflow-hidden rounded-3xl border md:grid-cols-3"
    >
      <aside
        aria-label={t("listTitle")}
        className={cn(
          "flex min-w-0 flex-col border-b md:border-e md:border-b-0",
          chatId !== null && "hidden md:flex",
        )}
      >
        <ChatList />
      </aside>
      <div className={cn("flex min-w-0 flex-col md:col-span-2", chatId === null && "hidden md:flex")}>
        <Conversation chatId={chatId} />
      </div>
    </section>
  );
};

const ChatList = () => {
  const t = useTranslations("ai.chat");
  const format = useFormat();
  const canAct = useCanAct();
  const chats = useChatsQuery();
  const create = useCreateChat();
  const remove = useDeleteChat();
  const { chatId, selectChat } = useSelectedChat();
  const [toDelete, setToDelete] = useState<AiChat | null>(null);

  const startNew = () =>
    create.mutate(undefined, {
      onSuccess: (chat) => selectChat(chat.id),
      onError: () => toast.error(t("createFailed")),
    });

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3">
        <h2 className="me-auto text-sm font-semibold">{t("listTitle")}</h2>
        <Button size="sm" disabled={create.isPending} aria-busy={create.isPending} onClick={startNew}>
          <MessageSquarePlus aria-hidden />
          {t("newChat")}
        </Button>
      </div>
      <QueryState
        query={chats}
        skeleton={<ListSkeleton rows={4} className="px-4" />}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <StateBlock icon={MessagesSquare} title={t("listEmptyTitle")} description={t("listEmptyText")} />
        }
      >
        {(rows) => (
          <ul className="flex flex-col gap-1 px-2 pb-3">
            {rows.map((chat) => (
              <li key={chat.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  aria-current={chat.id === chatId ? "true" : undefined}
                  onClick={() => selectChat(chat.id)}
                  className={cn(
                    "hover:bg-surface-3 min-w-0 flex-1 rounded-xl px-3 py-2 text-left transition-colors",
                    chat.id === chatId && "bg-accent-soft",
                  )}
                >
                  <span className="block truncate text-sm font-semibold">{chat.title ?? t("untitled")}</span>
                  <span className="text-2xs text-ink-3 block">
                    {t("chatMeta", { count: chat.messageCount })}
                    {(chat.lastMessageAt ?? chat.createdAt)
                      ? ` · ${format.dateTime(chat.lastMessageAt ?? chat.createdAt ?? "")}`
                      : ""}
                  </span>
                </button>
                {canAct ? (
                  <Button
                    intent="ghost"
                    size="icon"
                    aria-label={t("delete", { title: chat.title ?? t("untitled") })}
                    onClick={() => setToDelete(chat)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => (open ? undefined : setToDelete(null))}
        title={t("deleteTitle", { title: toDelete?.title ?? t("untitled") })}
        description={t("deleteDescription")}
        confirmLabel={t("deleteConfirm")}
        pendingLabel={t("deleting")}
        isPending={remove.isPending}
        error={remove.isError ? t("deleteFailed") : undefined}
        onConfirm={() => {
          if (!toDelete) return;
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              if (toDelete.id === chatId) selectChat(null);
              setToDelete(null);
            },
          });
        }}
      />
    </>
  );
};

const Conversation = ({ chatId }: { chatId: number | null }) => {
  const t = useTranslations("ai.chat");
  const locale = useLocale();
  const status = useAiStatusQuery();
  const messages = useMessagesQuery(chatId);
  const create = useCreateChat();
  const send = useSendMessage();
  const { selectChat } = useSelectedChat();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  // ikki marta yuborishdan himoya: `isPending` keyingi chizishgacha eskirgan bo'ladi
  const sending = useRef(false);

  const firstPage = messages.data?.pages[0];
  const unavailable = status.data?.enabled === false || firstPage?.aiAvailable === false;
  const isBusy = send.isPending || create.isPending;
  const trimmed = text.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MESSAGE_MIN;
  const canSend = !unavailable && !isBusy && trimmed.length >= MESSAGE_MIN && trimmed.length <= MESSAGE_MAX;
  const lang = locale === "ru" ? "ru" : "uz";

  const history = messages.data ? mergeMessagePages(messages.data.pages) : [];

  const deliver = (target: number, question: string, afterId: number | null) => {
    const base = { chatId: target, text: question, afterId, startedAt: currentTime() };
    setPending({ ...base, checking: false, error: null });
    send.mutate(
      {
        chatId: target,
        text: question,
        lang,
        afterId,
        onChecking: () => setPending((current) => (current ? { ...current, checking: true } : current)),
      },
      {
        onSettled: () => {
          sending.current = false;
        },
        onSuccess: () => setPending(null),
        onError: (error) => setPending({ ...base, checking: false, error: chatFailure(toAppError(error)) }),
      },
    );
  };

  /** Suhbat tanlanmagan bo'lsa — avval yangisi ochiladi (AI chaqirilmaydi), keyin savol ketadi. */
  const ask = (question: string) => {
    if (sending.current || unavailable) return;
    sending.current = true;
    setText("");
    if (chatId !== null) return deliver(chatId, question, lastMessageId(history));
    create.mutate(undefined, {
      onSuccess: (chat) => {
        selectChat(chat.id);
        deliver(chat.id, question, null);
      },
      onError: () => {
        sending.current = false;
        setText(question);
        toast.error(t("createFailed"));
      },
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSend) ask(trimmed);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) ask(trimmed);
    }
  };

  const shownPending = pending && pending.chatId === chatId ? pending : null;

  return (
    <>
      {chatId !== null ? (
        <div className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
          <Button intent="ghost" size="sm" onClick={() => selectChat(null)}>
            <ArrowLeft aria-hidden />
            {t("back")}
          </Button>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-5 md:px-6">
        {chatId === null ? (
          <Welcome disabled={unavailable || isBusy} onPick={ask} />
        ) : (
          <QueryState query={messages} skeleton={<ListSkeleton rows={4} />}>
            {() => (
              <>
                {messages.hasNextPage ? (
                  <Button
                    size="sm"
                    intent="ghost"
                    className="self-center"
                    disabled={messages.isFetchingNextPage}
                    aria-busy={messages.isFetchingNextPage}
                    onClick={() => void messages.fetchNextPage()}
                  >
                    {t(messages.isFetchingNextPage ? "loadingOlder" : "loadOlder")}
                  </Button>
                ) : null}
                {history.length === 0 && !shownPending ? (
                  <p className="text-ink-3 py-6 text-center text-sm">{t("emptyChat")}</p>
                ) : (
                  <ol className="flex flex-col gap-4">
                    {history.map((message, index) => (
                      <MessageItem
                        key={message.id}
                        message={message}
                        question={questionBefore(history, index)}
                      />
                    ))}
                    {shownPending ? (
                      <PendingItem
                        pending={shownPending}
                        busy={isBusy}
                        onRetry={() => {
                          if (sending.current) return;
                          sending.current = true;
                          deliver(shownPending.chatId, shownPending.text, lastMessageId(history));
                        }}
                        onDismiss={() => setPending(null)}
                      />
                    ) : null}
                  </ol>
                )}
              </>
            )}
          </QueryState>
        )}
      </div>
      {unavailable ? (
        <p role="status" className="text-warn border-t px-4 py-3 text-sm md:px-6">
          {t("unavailable")}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="border-t px-4 py-3 md:px-6">
          <div className="flex items-end gap-2">
            <label htmlFor="ai-message" className="sr-only">
              {t("placeholder")}
            </label>
            <textarea
              id="ai-message"
              rows={2}
              maxLength={MESSAGE_MAX}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={onKeyDown}
              // javob kutilayotganda yangi savol yozilmaydi — ikkinchi AI chaqiruvi ketmasin
              disabled={isBusy}
              placeholder={t("placeholder")}
              aria-invalid={tooShort}
              aria-describedby="ai-message-hint"
              className="border-border-strong bg-surface/60 placeholder:text-ink-3 focus-visible:border-accent focus-visible:ring-accent/25 min-h-11 w-full resize-none rounded-xl border px-3.5 py-2.5 text-base focus-visible:ring-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
            <Button
              type="submit"
              intent="primary"
              size="icon"
              aria-label={isBusy ? t("sending") : t("send")}
              aria-busy={isBusy}
              disabled={!canSend}
            >
              <ArrowUp aria-hidden />
            </Button>
          </div>
          <p id="ai-message-hint" className="text-2xs text-ink-3 mt-1.5" aria-live="polite">
            {tooShort
              ? t("tooShort", { min: MESSAGE_MIN })
              : text.length > MESSAGE_MAX - 200
                ? t("charsLeft", { count: MESSAGE_MAX - text.length })
                : isBusy
                  ? t("locked")
                  : null}
          </p>
          <p className="text-2xs text-ink-3 mt-2 text-center">{t("disclaimer")}</p>
        </form>
      )}
    </>
  );
};

const Welcome = ({ disabled, onPick }: { disabled: boolean; onPick: (prompt: string) => void }) => {
  const t = useTranslations("ai.chat");
  return (
    <div className="py-4 text-center">
      <h2 className="font-display text-3xl">{t("welcomeTitle")}</h2>
      <p className="text-ink-2 text-md mx-auto mt-2 max-w-md">{t("welcomeText")}</p>
      <div className="mx-auto mt-5 grid max-w-2xl gap-2 sm:grid-cols-2">
        {STARTERS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onPick(t(`starters.${key}.prompt`))}
            className="hover:bg-surface-2 flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon aria-hidden className="text-accent mt-0.5 size-4.5 shrink-0" />
            <span>
              <span className="block text-sm font-semibold">{t(`starters.${key}.title`)}</span>
              <span className="text-ink-3 block text-xs">{t(`starters.${key}.hint`)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

/** Javobdan oldingi foydalanuvchi savoli (hisobot nomi va «hisobot so'radimi» uchun). */
const questionBefore = (history: readonly AiMessage[], index: number): string | null => {
  for (let at = index - 1; at >= 0; at -= 1) {
    const message = history[at];
    if (message?.role === "user") return message.text;
  }
  return null;
};

const MessageItem = ({ message, question }: { message: AiMessage; question: string | null }) => {
  if (message.role === "user")
    return (
      <li className="bg-accent-soft text-ink ml-auto max-w-xl rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap">
        {message.text}
      </li>
    );
  return (
    <li className="flex gap-3">
      <AiAvatar />
      <div className="min-w-0 flex-1">
        <AiAnswer message={message} question={question} />
      </div>
    </li>
  );
};

/** Soniya sanagichi: «AI o'ylayapti… 14 s» — kutish tirik ekani ko'rinsin. */
/** Yuborish vaqti — faqat hodisa ichida chaqiriladi (render paytida emas). */
const currentTime = (): number => Date.now();

const useElapsedSeconds = (since: number, active: boolean): number => {
  const [now, setNow] = useState(since);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return Math.max(0, Math.floor((now - since) / 1000));
};

const PendingItem = ({
  pending,
  busy,
  onRetry,
  onDismiss,
}: {
  pending: Pending;
  busy: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}) => {
  const t = useTranslations("ai.chat");
  const waiting = pending.error === null;
  const seconds = useElapsedSeconds(pending.startedAt, waiting);
  // «Qayta yuborish» — yana bitta AI xarajati: faqat javob haqiqatan yo'q bo'lganda (hujjat 56)
  const canRetry =
    pending.error === "noReply" || pending.error === "offline" || pending.error === "rateLimited";
  return (
    <li className="flex flex-col gap-2.5">
      <p className="bg-accent-soft text-ink ml-auto max-w-xl rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap">
        {pending.text}
      </p>
      <div className="flex gap-3">
        <AiAvatar thinking={waiting} />
        <div className="min-w-0 flex-1">
          {pending.error ? (
            <>
              <p role="alert" className="text-crit text-sm">
                {t(`errors.${pending.error}`)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {canRetry ? (
                  <Button size="sm" disabled={busy} onClick={onRetry}>
                    {t("retry")}
                  </Button>
                ) : null}
                <Button size="sm" intent="ghost" onClick={onDismiss}>
                  {t("dismiss")}
                </Button>
              </div>
            </>
          ) : (
            <div role="status" aria-live="polite" className="flex flex-col gap-1">
              <p className="text-ink flex items-center gap-2 text-sm font-semibold">
                {pending.checking ? t("checking") : t("thinking")}
                <span aria-hidden className="flex gap-1">
                  <span className="bg-accent animate-typing size-1.5 rounded-full" />
                  <span className="bg-accent animate-typing anim-delay-1 size-1.5 rounded-full" />
                  <span className="bg-accent animate-typing anim-delay-2 size-1.5 rounded-full" />
                </span>
                <span className="text-ink-3 num text-xs font-normal">{t("elapsed", { seconds })}</span>
              </p>
              <p className="text-ink-3 text-xs">{pending.checking ? t("checkingHint") : t("thinkingHint")}</p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
};
