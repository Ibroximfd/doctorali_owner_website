"use client";

import { Lock, Send, ShieldAlert, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { env } from "@/shared/config/env";
import { routes } from "@/shared/config/routes";
import { PIN_MAX_ATTEMPTS, isWeakPin } from "@/shared/domain/telegram-pin";
import { useFormat } from "@/shared/hooks/use-format";
import { useTelegramWebApp } from "@/shared/hooks/use-telegram-web-app";
import { toAppError } from "@/shared/lib/app-error";
import { cn } from "@/shared/lib/cn";
import { safeNextPath } from "@/shared/lib/safe-next-path";
import { currentWebApp, haptic, syncTelegramColors } from "@/shared/lib/telegram";
import { Banner } from "@/shared/ui/banner";
import { Button } from "@/shared/ui/button";
import { BrandMark } from "@/shared/ui/shell/brand";
import { ErrorState, StateBlock } from "@/shared/ui/states";

import { useLinkTelegram, usePinSignIn, useTelegramStatusQuery } from "../hooks/use-telegram";
import { linkFailureOf, lockRemaining, pinFailureOf } from "../model/telegram.rules";
import type { TelegramStatus } from "../model/telegram.schema";
import { PinPad } from "./pin-pad";

type TelegramEntryProps = {
  /** PIN dan keyin ochiladigan sahifa (bot xabaridagi tugma beradi). */
  next?: string;
  /** Parol + SMS formasi (`auth` featuredan, `app` qatlamida ulanadi). */
  renderSignIn: (onSignedIn: () => void) => ReactNode;
};

/** Qulf tugaganidan keyin server javobi o'zgarguncha holatni qayta so'rash oralig'i. */
const LOCK_RECHECK_MS = 5_000;

type NewPinError = "weak" | "mismatch" | "offline" | "server";
type Blocked = "alreadyLinked" | "initData";

type Step =
  | { kind: "status" }
  | { kind: "sign-in"; isRecovery: boolean; needsReauth: boolean }
  | { kind: "new-pin"; error: NewPinError | null; attempt: number }
  | { kind: "confirm-pin"; firstPin: string }
  | { kind: "blocked"; reason: Blocked };

/**
 * Mini app kirish nuqtasi (`/tg`): Telegram tekshiruvi → bog'lanmagan bo'lsa
 * parol + SMS va PIN o'rnatish → aks holda PIN. Sessiya har ochilishda yangidan.
 */
export const TelegramEntry = ({ next, renderSignIn }: TelegramEntryProps) => {
  const sdk = useTelegramWebApp();

  useEffect(() => {
    if (sdk.status !== "ready") return;
    sdk.webApp.ready();
    sdk.webApp.expand();
    syncTelegramColors(sdk.webApp);
  }, [sdk]);

  if (sdk.status === "loading") return <EntrySplash />;

  const initData = sdk.status === "ready" ? sdk.webApp.initData : null;
  if (initData === null) return <NotInTelegram />;

  return <EntryFlow initData={initData} next={next} renderSignIn={renderSignIn} />;
};

type EntryFlowProps = { initData: string; next?: string; renderSignIn: TelegramEntryProps["renderSignIn"] };

const EntryFlow = ({ initData, next, renderSignIn }: EntryFlowProps) => {
  const status = useTelegramStatusQuery(initData);
  const [step, setStep] = useState<Step>({ kind: "status" });

  const finish = () => {
    haptic("success");
    window.location.assign(safeNextPath(next));
  };
  const startRecovery = () => setStep({ kind: "sign-in", isRecovery: true, needsReauth: false });
  const askNewPin = (error: NewPinError | null = null) =>
    setStep((current) => ({
      kind: "new-pin",
      error,
      attempt: current.kind === "new-pin" ? current.attempt + 1 : 0,
    }));

  switch (step.kind) {
    case "blocked":
      return <BlockedView reason={step.reason} />;
    case "sign-in":
      return (
        <SignInStep
          isRecovery={step.isRecovery}
          needsReauth={step.needsReauth}
          onCancel={step.isRecovery ? () => setStep({ kind: "status" }) : undefined}
        >
          {renderSignIn(() => askNewPin())}
        </SignInStep>
      );
    case "new-pin":
      return (
        <NewPinStep
          key={step.attempt}
          error={step.error}
          onPin={(pin) =>
            isWeakPin(pin) ? askNewPin("weak") : setStep({ kind: "confirm-pin", firstPin: pin })
          }
        />
      );
    case "confirm-pin":
      return (
        <ConfirmPinStep
          initData={initData}
          firstPin={step.firstPin}
          onMismatch={() => askNewPin("mismatch")}
          onLinked={finish}
          onFailure={(failure) => {
            if (failure === "alreadyLinked" || failure === "initData")
              return setStep({ kind: "blocked", reason: failure });
            if (failure === "reauth")
              return setStep({ kind: "sign-in", isRecovery: false, needsReauth: true });
            askNewPin(failure);
          }}
        />
      );
    case "status":
      break;
  }

  if (status.isPending) return <EntrySplash />;
  if (status.isError) {
    const error = toAppError(status.error);
    if (error.code?.startsWith("init_data_")) return <BlockedView reason="initData" />;
    return (
      <EntryCard>
        <ErrorState error={error} onRetry={() => void status.refetch()} />
      </EntryCard>
    );
  }

  const current = status.data;
  if (current.state === "unlinked")
    return (
      <SignInStep isRecovery={false} needsReauth={false}>
        {renderSignIn(() => askNewPin())}
      </SignInStep>
    );
  if (current.state === "locked")
    return <LockedView status={current} onExpired={() => void status.refetch()} onForgot={startRecovery} />;

  return (
    <PinStep
      initData={initData}
      status={current}
      onSignedIn={finish}
      onStale={() => void status.refetch()}
      onBlocked={() => setStep({ kind: "blocked", reason: "initData" })}
      onForgot={startRecovery}
    />
  );
};

/* ---------- qadamlar ---------- */

type PinStepProps = {
  initData: string;
  status: TelegramStatus;
  onSignedIn: () => void;
  /** Holat o'zgardi (qolgan urinishlar, qulf, bog'lanish uzildi) — qayta so'raladi. */
  onStale: () => void;
  onBlocked: () => void;
  onForgot: () => void;
};

const PinStep = ({ initData, status, onSignedIn, onStale, onBlocked, onForgot }: PinStepProps) => {
  const t = useTranslations("telegram");
  const signIn = usePinSignIn();
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const attemptsLeft = status.attemptsLeft;

  const submit = (pin: string) =>
    signIn.mutate(
      { initData, pin },
      {
        onSuccess: onSignedIn,
        onError: (raw) => {
          const failure = pinFailureOf(toAppError(raw));
          haptic("error");
          setAttempt((value) => value + 1);
          if (failure === "initData") return onBlocked();
          if (failure === "invalid" || failure === "locked" || failure === "unlinked") onStale();
          setError(failure === "locked" || failure === "unlinked" ? null : t(`errors.${failure}`));
        },
      },
    );

  return (
    <EntryCard>
      <PinPad
        key={attempt}
        title={status.fullName ? t("pin.greeting", { name: status.fullName }) : t("pin.title")}
        description={t("pin.description")}
        error={error}
        note={
          attemptsLeft !== null && attemptsLeft < PIN_MAX_ATTEMPTS
            ? t("pin.attemptsLeft", { count: attemptsLeft })
            : undefined
        }
        isBusy={signIn.isPending}
        onComplete={submit}
        footer={<TextButton onClick={onForgot}>{t("pin.forgot")}</TextButton>}
      />
    </EntryCard>
  );
};

const NewPinStep = ({ error, onPin }: { error: NewPinError | null; onPin: (pin: string) => void }) => {
  const t = useTranslations("telegram");
  return (
    <EntryCard>
      <StepLabel step={2} />
      <PinPad
        title={t("newPin.title")}
        description={t("newPin.description")}
        error={error ? t(`errors.${error}`) : null}
        onComplete={onPin}
      />
    </EntryCard>
  );
};

type ConfirmPinStepProps = {
  initData: string;
  firstPin: string;
  onMismatch: () => void;
  onLinked: () => void;
  onFailure: (failure: ReturnType<typeof linkFailureOf>) => void;
};

const ConfirmPinStep = ({ initData, firstPin, onMismatch, onLinked, onFailure }: ConfirmPinStepProps) => {
  const t = useTranslations("telegram");
  const link = useLinkTelegram();

  const submit = (pin: string) => {
    if (pin !== firstPin) {
      haptic("error");
      return onMismatch();
    }
    link.mutate(
      { initData, pin },
      {
        onSuccess: onLinked,
        onError: (raw) => {
          haptic("error");
          onFailure(linkFailureOf(toAppError(raw)));
        },
      },
    );
  };

  return (
    <EntryCard>
      <StepLabel step={2} />
      <PinPad
        title={t("confirmPin.title")}
        description={t("confirmPin.description")}
        isBusy={link.isPending}
        onComplete={submit}
      />
    </EntryCard>
  );
};

type SignInStepProps = {
  isRecovery: boolean;
  needsReauth: boolean;
  onCancel?: () => void;
  children: ReactNode;
};

const SignInStep = ({ isRecovery, needsReauth, onCancel, children }: SignInStepProps) => {
  const t = useTranslations("telegram");
  return (
    <div className="flex w-full max-w-100 flex-col gap-4">
      <div className="px-1">
        <StepLabel step={1} />
        <h1 className="font-strong mt-1 text-xl tracking-tight">
          {t(isRecovery ? "link.recoverTitle" : "link.title")}
        </h1>
        <p className="text-ink-3 mt-1 text-sm">
          {t(isRecovery ? "link.recoverDescription" : "link.description")}
        </p>
      </div>
      {needsReauth ? <Banner icon={TriangleAlert}>{t("errors.reauth")}</Banner> : null}
      {children}
      {onCancel ? (
        <TextButton onClick={onCancel} className="self-center">
          {t("link.cancel")}
        </TextButton>
      ) : null}
    </div>
  );
};

type LockedViewProps = { status: TelegramStatus; onExpired: () => void; onForgot: () => void };

const LockedView = ({ status, onExpired, onForgot }: LockedViewProps) => {
  const t = useTranslations("telegram");
  const format = useFormat();
  const [now, setNow] = useState(() => Date.now());
  const until = status.lockedUntil;
  const remaining = until === null ? null : lockRemaining(until, now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isOver = remaining === null;
  const onExpiredRef = useRef(onExpired);
  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);
  // Qulf tugagach holat qayta so'raladi; telefon soati serverdan oldinda bo'lsa server hali
  // «qulf» deydi — shuning uchun javob o'zgarguncha har bir necha soniyada qaytariladi.
  useEffect(() => {
    if (!isOver) return;
    onExpiredRef.current();
    const timer = window.setInterval(() => onExpiredRef.current(), LOCK_RECHECK_MS);
    return () => window.clearInterval(timer);
  }, [isOver]);

  return (
    <EntryCard>
      <StateBlock
        titleAs="h1"
        icon={Lock}
        tone="crit"
        title={t("locked.title")}
        description={until === null ? undefined : t("locked.description", { time: format.time(until) })}
        action={
          <div className="flex flex-col items-center gap-3">
            {remaining ? (
              <span role="timer" className="num text-ink-2 text-2xl font-semibold">
                {t("locked.countdown", {
                  minutes: remaining.minutes,
                  seconds: String(remaining.seconds).padStart(2, "0"),
                })}
              </span>
            ) : null}
            <TextButton onClick={onForgot}>{t("pin.forgot")}</TextButton>
          </div>
        }
      />
    </EntryCard>
  );
};

/* ---------- yordamchi ko'rinishlar ---------- */

const BlockedView = ({ reason }: { reason: Blocked }) => {
  const t = useTranslations("telegram");
  const webApp = currentWebApp();
  return (
    <EntryCard>
      <StateBlock
        titleAs="h1"
        icon={ShieldAlert}
        tone="crit"
        title={t(`blocked.${reason}.title`)}
        description={t(`blocked.${reason}.description`)}
        action={
          webApp ? (
            <Button size="sm" onClick={() => webApp.close()}>
              {t("close")}
            </Button>
          ) : undefined
        }
      />
    </EntryCard>
  );
};

const NotInTelegram = () => {
  const t = useTranslations("telegram.notInTelegram");
  const username = env.telegramBotUsername;
  return (
    <EntryCard>
      <StateBlock
        titleAs="h1"
        icon={Send}
        title={t("title")}
        description={t("description")}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {username ? (
              <Button asChild intent="primary" size="sm">
                <a href={`https://t.me/${username}`}>{t("openBot")}</a>
              </Button>
            ) : null}
            <Button asChild size="sm">
              <a href={routes.login}>{t("web")}</a>
            </Button>
          </div>
        }
      />
    </EntryCard>
  );
};

const EntrySplash = () => {
  const t = useTranslations("telegram");
  return (
    <div role="status" className="flex flex-col items-center gap-4">
      <BrandMark className="size-12 animate-pulse motion-reduce:animate-none" />
      <span className="text-ink-3 text-sm">{t("loading")}</span>
    </div>
  );
};

const EntryCard = ({ children }: { children: ReactNode }) => (
  <div className="bg-surface flex w-full max-w-100 flex-col gap-4 rounded-2xl border p-6 md:p-7">
    {children}
  </div>
);

const StepLabel = ({ step }: { step: 1 | 2 }) => {
  const t = useTranslations("telegram.link");
  return <span className="text-accent text-2xs font-semibold">{t("step", { step })}</span>;
};

const TextButton = ({
  onClick,
  className,
  children,
}: {
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn("text-accent text-sm font-semibold hover:underline", className)}
  >
    {children}
  </button>
);
