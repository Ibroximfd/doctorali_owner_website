"use client";

import { Delete } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { PIN_LENGTH } from "@/shared/domain/telegram-pin";
import { cn } from "@/shared/lib/cn";

type PinPadProps = {
  title: string;
  description?: string;
  /** Oldingi urinish xatosi: nuqtalar silkinadi, matn ekran o'quvchiga ham aytiladi. */
  error?: string | null;
  /** Xato ostidagi qo'shimcha (qolgan urinishlar). */
  note?: ReactNode;
  isBusy?: boolean;
  /** To'rtinchi raqam kiritilishi bilan chaqiriladi; maydon o'zi tozalanadi. */
  onComplete: (pin: string) => void;
  footer?: ReactNode;
};

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const keyClass =
  "num grid h-14 place-items-center rounded-xl bg-surface-2 text-2xl font-strong text-ink transition-colors hover:bg-surface-3 active:bg-surface-3 disabled:opacity-50 sm:h-15";

/**
 * PIN klaviaturasi: telefon uchun katta tugmalar, kompyuterda — klaviaturadan
 * raqam ham yoziladi. Har yangi urinish uchun ota-komponent `key` ni almashtiradi.
 */
export const PinPad = ({
  title,
  description,
  error,
  note,
  isBusy = false,
  onComplete,
  footer,
}: PinPadProps) => {
  const t = useTranslations("telegram.pad");
  const [pin, setPin] = useState("");
  // Tez yozilganda ham raqam yo'qolmasin: oxirgi qiymat ref da, chizish uchun — holatda.
  const pinRef = useRef("");
  const isSubmittedRef = useRef(false);

  const update = (next: string) => {
    pinRef.current = next;
    setPin(next);
  };

  const press = (digit: string) => {
    // To'rtinchi raqamdan keyingi tez bosish keyingi PIN ning boshiga aylanmasin:
    // har urinishda ota-komponent klaviaturani yangidan yaratadi (`key`).
    if (isBusy || isSubmittedRef.current) return;
    const next = pinRef.current + digit;
    if (next.length > PIN_LENGTH) return;
    if (next.length < PIN_LENGTH) return update(next);
    update("");
    isSubmittedRef.current = true;
    onComplete(next);
  };

  const erase = () => {
    if (!isBusy) update(pinRef.current.slice(0, -1));
  };

  const pressRef = useRef(press);
  const eraseRef = useRef(erase);
  useEffect(() => {
    pressRef.current = press;
    eraseRef.current = erase;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^\d$/.test(event.key)) pressRef.current(event.key);
      else if (event.key === "Backspace") eraseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="text-center">
        <h1 className="font-strong text-xl tracking-tight">{title}</h1>
        {description ? <p className="text-ink-3 mt-1 text-sm">{description}</p> : null}
      </div>

      <div
        role="img"
        aria-label={t("progress", { count: pin.length, total: PIN_LENGTH })}
        className={cn("flex gap-3.5 py-1", error && "animate-shake motion-reduce:animate-none")}
      >
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <span
            key={index}
            className={cn(
              "size-3.5 rounded-full border-2 transition-colors",
              index < pin.length ? "border-ink bg-ink" : "border-border-strong",
              error && pin.length === 0 && "border-crit",
            )}
          />
        ))}
      </div>

      <div className="min-h-10 text-center" aria-live="polite">
        {error ? (
          <p role="alert" className="text-crit text-sm font-semibold">
            {error}
          </p>
        ) : null}
        {note ? <p className="text-ink-3 text-xs">{note}</p> : null}
      </div>

      <div className="grid w-full max-w-72 grid-cols-3 gap-3" aria-busy={isBusy}>
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            className={keyClass}
            disabled={isBusy}
            onClick={() => press(digit)}
          >
            {digit}
          </button>
        ))}
        <span aria-hidden />
        <button type="button" className={keyClass} disabled={isBusy} onClick={() => press("0")}>
          0
        </button>
        <button
          type="button"
          aria-label={t("delete")}
          className={cn(keyClass, "bg-transparent")}
          disabled={isBusy || pin.length === 0}
          onClick={erase}
        >
          <Delete aria-hidden className="size-6" strokeWidth={1.75} />
        </button>
      </div>

      {footer}
    </div>
  );
};
