"use client";

import { ArrowUp, Building2, CalendarCheck, UsersRound, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { toAppError } from "@/shared/lib/app-error";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

import { useAskAi } from "../hooks/use-ai";
import { QUESTION_MAX, QUESTION_MIN } from "../model/ai.rules";
import type { ChatAnswer } from "../model/ai.schema";
import { AiAvatar } from "./ai-orb";

const STARTERS = [
  { key: "overview", icon: CalendarCheck },
  { key: "money", icon: Wallet },
  { key: "conversion", icon: UsersRound },
  { key: "sklad", icon: Building2 },
] as const;

type Turn = { id: number; question: string; answer: ChatAnswer | null; error: string | null };

/** Backend xatosi → tushunarli gap (§8.3): 429 — tezlik, 503 — o'chiq, 422 — rad etdi, 400 — uzunlik. */
const errorKey = (error: unknown): string => {
  const appError = toAppError(error);
  if (appError.code === "too_many_attempts" || appError.kind === "rate-limited") return "rateLimited";
  if (appError.code === "ai_unavailable") return "unavailable";
  if (appError.code === "ai_refused") return "refused";
  if (appError.code === "validation_error") return "invalid";
  return appError.kind === "offline" ? "offline" : "failed";
};

/**
 * AI chat (§8.3): savol → bitta javob, `tools_used` (qaysi manbadan) va `period` (qaysi davr).
 * Backend suhbatni saqlamaydi — tarix shu oynada, sahifa yopilsa tozalanadi.
 */
export const ChatPanel = () => {
  const t = useTranslations("ai.chat");
  const ask = useAskAi();
  const [turns, setTurns] = useState<Turn[]>([]);
  const nextId = useRef(1);
  const [text, setText] = useState("");
  const trimmed = text.trim();
  const canSend = trimmed.length >= QUESTION_MIN && trimmed.length <= QUESTION_MAX && !ask.isPending;

  // ikki marta yuborishdan himoya: `isPending` keyingi chizishgacha eskirgan bo'ladi
  const sending = useRef(false);
  const tooShort = trimmed.length > 0 && trimmed.length < QUESTION_MIN;
  const nearLimit = text.length > QUESTION_MAX - 100;

  const send = (question: string) => {
    if (ask.isPending || sending.current) return;
    sending.current = true;
    const id = nextId.current++;
    setTurns((current) => [...current, { id, question, answer: null, error: null }]);
    setText("");
    ask.mutate(question, {
      onSettled: () => {
        sending.current = false;
      },
      onSuccess: (answer) =>
        setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, answer } : turn))),
      onError: (error) =>
        setTurns((current) =>
          current.map((turn) => (turn.id === id ? { ...turn, error: errorKey(error) } : turn)),
        ),
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSend) send(trimmed);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) send(trimmed);
    }
  };

  return (
    <section aria-label={t("conversation")} className="panel-surface flex flex-col rounded-3xl border">
      <div className="flex flex-col gap-4 px-4 py-5 md:px-6">
        {turns.length === 0 ? (
          <div className="py-4 text-center">
            <h2 className="font-display text-3xl">{t("welcomeTitle")}</h2>
            <p className="text-ink-2 text-md mx-auto mt-2 max-w-md">{t("welcomeText")}</p>
            <div className="mx-auto mt-5 grid max-w-2xl gap-2 sm:grid-cols-2">
              {STARTERS.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  disabled={ask.isPending}
                  onClick={() => send(t(`starters.${key}.prompt`))}
                  className="hover:bg-surface-2 flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors"
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
        ) : (
          <ol className="flex flex-col gap-4">
            {turns.map((turn) => (
              <TurnItem key={turn.id} turn={turn} />
            ))}
          </ol>
        )}
      </div>
      <form onSubmit={onSubmit} className="border-t px-4 py-3 md:px-6">
        <div className="flex items-end gap-2">
          <label htmlFor="ai-question" className="sr-only">
            {t("placeholder")}
          </label>
          <textarea
            id="ai-question"
            rows={2}
            maxLength={QUESTION_MAX}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("placeholder")}
            aria-invalid={tooShort}
            aria-describedby="ai-question-hint"
            className="border-border-strong bg-surface/60 placeholder:text-ink-3 focus-visible:border-accent focus-visible:ring-accent/25 min-h-11 w-full resize-none rounded-xl border px-3.5 py-2.5 text-base focus-visible:ring-3 focus-visible:outline-none"
          />
          <Button
            type="submit"
            intent="primary"
            size="icon"
            aria-label={ask.isPending ? t("sending") : t("send")}
            aria-busy={ask.isPending}
            disabled={!canSend}
          >
            <ArrowUp aria-hidden />
          </Button>
        </div>
        <p id="ai-question-hint" className="text-2xs text-ink-3 mt-1.5" aria-live="polite">
          {tooShort
            ? t("tooShort", { min: QUESTION_MIN })
            : nearLimit
              ? t("charsLeft", { count: QUESTION_MAX - text.length })
              : ask.isPending
                ? t("sending")
                : null}
        </p>
        <p className="text-2xs text-ink-3 mt-2 text-center">{t("disclaimer")}</p>
      </form>
    </section>
  );
};

const TurnItem = ({ turn }: { turn: Turn }) => {
  const t = useTranslations("ai.chat");
  const format = useFormat();
  return (
    <li className="flex flex-col gap-2.5">
      <p className="bg-accent-soft text-ink ml-auto max-w-xl rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap">
        {turn.question}
      </p>
      <div className="flex gap-3">
        <AiAvatar />
        <div className="min-w-0 flex-1">
          {turn.answer ? (
            <>
              <p className="text-ink text-sm leading-relaxed whitespace-pre-line">{turn.answer.answer}</p>
              <div className="text-2xs text-ink-3 mt-2 flex flex-wrap items-center gap-1.5">
                {turn.answer.period ? (
                  <span>
                    {t("period", {
                      from: format.date(turn.answer.period.dateFrom),
                      to: format.date(turn.answer.period.dateTo),
                    })}
                  </span>
                ) : null}
                {turn.answer.toolsUsed.length > 0 ? (
                  <>
                    <span>· {t("sources")}</span>
                    <ul aria-label={t("sources")} className="flex flex-wrap gap-1">
                      {turn.answer.toolsUsed.map((tool) => (
                        <li key={tool} className="bg-surface-3 num rounded-sm px-1.5 py-0.5">
                          {t.has(`tools.${tool}`) ? t(`tools.${tool}`) : tool}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </>
          ) : turn.error ? (
            <p role="alert" className="text-crit text-sm">
              {t(`errors.${turn.error}`)}
            </p>
          ) : (
            <p className={cn("text-ink-3 text-sm")} role="status">
              {t("thinking")}
            </p>
          )}
        </div>
      </div>
    </li>
  );
};
