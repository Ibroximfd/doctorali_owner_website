"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { toAppError, type AppError } from "@/shared/lib/app-error";
import { Banner } from "@/shared/ui/banner";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/input";
import { BrandMark } from "@/shared/ui/shell/brand";

import { useRequestChallenge, useVerifyCode } from "../hooks/use-auth";
import {
  CODE_LENGTH,
  codeInputSchema,
  loginInputSchema,
  safeNextPath,
  type Challenge,
  type CodeInput,
  type LoginFormValues,
  type LoginInput,
} from "../model/auth.schema";

const RESEND_SECONDS = 60;

/** Xato turini foydalanuvchiga tushunarli gapga aylantiradi (`auth.errors.*`). */
const errorKey = (error: AppError, step: "credentials" | "code"): string => {
  if (error.code === "login_locked") return "locked";
  if (error.kind === "rate-limited") return "tooMany";
  if (error.code === "challenge_expired") return "codeExpired";
  if (error.code === "sms_send_failed") return "smsFailed";
  if (error.kind === "unauthorized" || error.kind === "validation" || error.kind === "forbidden") {
    return step === "credentials" ? "invalidCredentials" : "invalidCode";
  }
  if (error.kind === "offline") return "offline";
  return "server";
};

type LoginFormProps = {
  next?: string;
  /** Berilsa kirgandan keyin sahifa almashmaydi — chaqiruvchi o'zi davom ettiradi (Telegram bog'lash). */
  onSignedIn?: () => void;
};

/** Kirish: login + parol. Backend SMS/TOTP so'rasa — ikkinchi qadamda kod. */
export const LoginForm = ({ next, onSignedIn }: LoginFormProps) => {
  const t = useTranslations("auth");
  const [credentials, setCredentials] = useState<LoginInput | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  return (
    <div className="bg-surface flex w-full max-w-100 flex-col gap-4 rounded-2xl border p-6 md:p-7">
      <div className="flex items-center gap-2.5">
        <BrandMark />
        <div className="leading-tight">
          <div className="text-md font-strong">Doctor Ali</div>
          <div className="text-2xs text-ink-3 font-medium">{t("product")}</div>
        </div>
      </div>

      {challenge && credentials ? (
        <CodeStep
          challenge={challenge}
          credentials={credentials}
          onChallenge={setChallenge}
          onBack={() => setChallenge(null)}
          next={next}
          onSignedIn={onSignedIn}
        />
      ) : (
        <CredentialsStep
          defaultValues={credentials}
          onSignedIn={() => finishSignIn(next, onSignedIn)}
          onChallenge={(input, received) => {
            setCredentials(input);
            setChallenge(received);
          }}
        />
      )}
    </div>
  );
};

/** Kirish tugadi: chaqiruvchi davom ettiradi yoki so'ralgan sahifaga to'liq o'tiladi (server yangi cookie ni ko'rsin). */
const finishSignIn = (next: string | undefined, onSignedIn: (() => void) | undefined) =>
  onSignedIn ? onSignedIn() : window.location.assign(safeNextPath(next));

type CredentialsStepProps = {
  defaultValues: LoginInput | null;
  onSignedIn: () => void;
  onChallenge: (input: LoginInput, challenge: Challenge) => void;
};

const CredentialsStep = ({ defaultValues, onSignedIn, onChallenge }: CredentialsStepProps) => {
  const t = useTranslations("auth");
  const request = useRequestChallenge();
  const form = useForm<LoginFormValues, unknown, LoginInput>({
    resolver: zodResolver(loginInputSchema),
    // Birinchi chiqishda tekshiradi, keyin har o'zgarishda — to'g'rilangan maydondagi xato darhol yo'qoladi.
    mode: "onTouched",
    defaultValues: {
      username: defaultValues?.username ?? "",
      password: "",
    },
  });
  const { errors } = form.formState;

  const submit = form.handleSubmit((input) => {
    if (request.isPending || request.isSuccess) return;
    request.mutate(input, {
      onSuccess: (result) =>
        result.kind === "signed-in" ? onSignedIn() : onChallenge(input, result.challenge),
      onError: (error) => form.setError("password", { message: errorKey(toAppError(error), "credentials") }),
    });
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
      <div>
        <h1 className="font-strong text-xl tracking-tight">{t("title")}</h1>
        <p className="text-ink-3 mt-1 text-sm">{t("credentialsStep")}</p>
      </div>
      <Field
        id="login-username"
        label={t("username")}
        error={errors.username?.message ? t(`errors.${errors.username.message}`) : undefined}
      >
        <Input
          id="login-username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={Boolean(errors.username)}
          aria-describedby={errors.username ? "login-username-error" : undefined}
          {...form.register("username")}
        />
      </Field>
      <Field
        id="login-password"
        label={t("password")}
        error={errors.password?.message ? t(`errors.${errors.password.message}`) : undefined}
      >
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          {...form.register("password")}
        />
      </Field>
      <Button
        type="submit"
        intent="primary"
        size="lg"
        // Kirilgach sahifa almashguncha ham band — ikkinchi bosish qayta so'rov yubormasin.
        disabled={request.isPending || request.isSuccess}
        aria-busy={request.isPending || request.isSuccess}
      >
        {request.isPending || request.isSuccess ? t("checking") : t("continue")}
      </Button>
      <p className="text-ink-3 text-xs">{t("lockNote")}</p>
    </form>
  );
};

type CodeStepProps = {
  challenge: Challenge;
  credentials: LoginInput;
  onChallenge: (challenge: Challenge) => void;
  onBack: () => void;
  next?: string;
  onSignedIn?: () => void;
};

const CodeStep = ({ challenge, credentials, onChallenge, onBack, next, onSignedIn }: CodeStepProps) => {
  const t = useTranslations("auth");
  const verify = useVerifyCode();
  const resend = useRequestChallenge();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const form = useForm<CodeInput>({ resolver: zodResolver(codeInputSchema), defaultValues: { code: "" } });
  const codeError = form.formState.errors.code?.message;

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const submit = form.handleSubmit(({ code }) => {
    if (verify.isPending || verify.isSuccess) return;
    verify.mutate(
      { challengeId: challenge.challengeId, code },
      {
        // To'liq o'tish: server komponentlar yangi sessiya cookie sini ko'rishi kerak.
        onSuccess: () => finishSignIn(next, onSignedIn),
        onError: (error) => {
          const key = errorKey(toAppError(error), "code");
          // Kod eskirdi yoki urinishlar tugadi — yangi kodni darhol so'rash mumkin.
          if (key === "codeExpired") setSecondsLeft(0);
          form.setError("code", { message: key });
        },
      },
    );
  });

  const sendAgain = () =>
    resend.mutate(credentials, {
      onSuccess: (result) => {
        if (result.kind === "signed-in") return finishSignIn(next, onSignedIn);
        onChallenge(result.challenge);
        setSecondsLeft(RESEND_SECONDS);
        form.reset();
      },
      onError: (error) => form.setError("code", { message: errorKey(toAppError(error), "credentials") }),
    });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
      <div>
        <h1 className="font-strong text-xl tracking-tight">{t("codeTitle")}</h1>
        <p className="text-ink-3 mt-1 text-sm">
          {challenge.method === "totp"
            ? t("codeFromApp")
            : t("codeSent", { phone: challenge.phoneMasked ?? "" })}
        </p>
      </div>
      <Field id="login-code" label={t("code")} error={codeError ? t(`errors.${codeError}`) : undefined}>
        <Input
          id="login-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          autoFocus
          aria-invalid={Boolean(codeError)}
          aria-describedby={codeError ? "login-code-error" : undefined}
          className="num h-12 text-center text-xl tracking-widest"
          {...form.register("code")}
        />
      </Field>
      <Button
        type="submit"
        intent="primary"
        size="lg"
        // Muvaffaqiyatdan keyin sahifa almashguncha ham — ishlatilgan kod qayta yuborilmasin.
        disabled={verify.isPending || verify.isSuccess}
        aria-busy={verify.isPending || verify.isSuccess}
      >
        {verify.isPending ? t("checking") : t("signIn")}
      </Button>
      <div className="flex items-center justify-between gap-3 text-xs">
        {challenge.method === "sms" ? (
          secondsLeft > 0 ? (
            <span className="text-ink-3">{t("resendIn", { seconds: secondsLeft })}</span>
          ) : (
            <button
              type="button"
              onClick={sendAgain}
              disabled={resend.isPending}
              className="text-accent font-semibold hover:underline disabled:opacity-50"
            >
              {t("resend")}
            </button>
          )
        ) : (
          <span />
        )}
        <button type="button" onClick={onBack} className="text-accent font-semibold hover:underline">
          {t("back")}
        </button>
      </div>
      <Banner icon={ShieldCheck} className="text-xs">
        {t("auditNote")}
      </Banner>
    </form>
  );
};
