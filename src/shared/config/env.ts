import { z } from "zod";

/**
 * Brauzerga ham ko'rinadigan sozlamalar (`NEXT_PUBLIC_*`). Server sirlari —
 * `env.server.ts` da. Qiymatlar modul yuklanishida bir marta tekshiriladi.
 */
const schema = z.object({
  NEXT_PUBLIC_API_MOCKING: z.enum(["0", "1"]).default("0"),
  NEXT_PUBLIC_WS_URL: z.string().url().optional(),
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z
    .string()
    .regex(/^[A-Za-z0-9_]{5,32}$/)
    .optional(),
});

const parsed = schema.parse({
  // Next `NEXT_PUBLIC_*` ni faqat to'liq yozilgan `process.env.X` ko'rinishida inline qiladi.
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING || undefined,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || undefined,
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || undefined,
});

export const env = {
  /** Backendsiz, namuna ma'lumot bilan ishlash rejimi. */
  isMocking: parsed.NEXT_PUBLIC_API_MOCKING === "1",
  wsUrl: parsed.NEXT_PUBLIC_WS_URL ?? null,
  /** «Telegram ichida oching» sahifasidagi bot havolasi uchun (ixtiyoriy). */
  telegramBotUsername: parsed.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? null,
} as const;
