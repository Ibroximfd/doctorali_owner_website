import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { parseInitData } from "./telegram-init-data";

/**
 * `initData` imzosini tekshirish — Telegram «Validating data received via the
 * Mini App» algoritmi. Backend aynan shuni qiladi (`02_BACKEND_TZ` §2); panelda
 * faqat namuna rejimida ishlatiladi, haqiqiy rejimda tekshiruv backendda.
 */
export const INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;

export type InitDataCheck = "ok" | "invalid" | "expired";

/** Imzo qatori: `hash` dan tashqari barcha juftlar, kalit bo'yicha saralangan, `\n` bilan. */
export const dataCheckString = (params: URLSearchParams): string =>
  [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

export const signDataCheckString = (checkString: string, botToken: string): string => {
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  return createHmac("sha256", secret).update(checkString).digest("hex");
};

export const checkInitData = (raw: string, botToken: string, now: Date = new Date()): InitDataCheck => {
  const parsed = parseInitData(raw);
  if (parsed === null) return "invalid";

  const expected = Buffer.from(
    signDataCheckString(dataCheckString(new URLSearchParams(raw)), botToken),
    "hex",
  );
  const given = Buffer.from(parsed.hash, "hex");
  // Uzunlik teng bo'lmasa `timingSafeEqual` otadi — avval tekshiriladi.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return "invalid";

  const ageSeconds = now.getTime() / 1000 - parsed.authDate;
  return ageSeconds > INIT_DATA_MAX_AGE_SECONDS ? "expired" : "ok";
};
