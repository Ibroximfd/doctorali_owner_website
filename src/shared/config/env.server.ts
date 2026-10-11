import "server-only";

import { z } from "zod";

import { resolveBackend } from "./backend-server";
import { env } from "./env";

/** Faqat serverda o'qiladigan sozlamalar. Brauzer bundle'iga tushmaydi. */
const schema = z
  .object({
    /**
     * Nomlanganlardan boshqa manzil (ixtiyoriy, serverdan ustun turadi). Faqat origin, yo'lsiz.
     * Qaysi nomlangan server — `APP_SERVER`; uni `config/servers.mjs` o'zi o'qiydi va tekshiradi.
     */
    BACKEND_ORIGIN: z.string().url().optional(),
    NODE_ENV: z.string().default("development"),
    /** Faqat namuna rejimida: Telegram `initData` imzosini panelning o'zi tekshiradi. */
    TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
    ALLOW_SAMPLE_DATA_IN_PRODUCTION: z.enum(["0", "1"]).default("0"),
  })
  // Namuna rejimida istalgan parol bilan kiriladi: productionda tasodifan qolib ketmasin.
  .refine(
    (value) =>
      !env.isMocking || value.NODE_ENV !== "production" || value.ALLOW_SAMPLE_DATA_IN_PRODUCTION === "1",
    {
      message:
        "Productionda NEXT_PUBLIC_API_MOCKING=1: istalgan parol bilan kirish ochiq bo'ladi. Ataylab bo'lsa ALLOW_SAMPLE_DATA_IN_PRODUCTION=1 qo'ying (docs/DEPLOY.md).",
      path: ["NEXT_PUBLIC_API_MOCKING"],
    },
  );

const parsed = schema.parse({
  BACKEND_ORIGIN: process.env.BACKEND_ORIGIN || undefined,
  NODE_ENV: process.env.NODE_ENV,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || undefined,
  ALLOW_SAMPLE_DATA_IN_PRODUCTION: process.env.ALLOW_SAMPLE_DATA_IN_PRODUCTION || undefined,
});

const backend = resolveBackend({ origin: parsed.BACKEND_ORIGIN });

export const serverEnv = {
  /** BFF murojaat qiladigan backend (`config/servers.mjs` — yagona manba). */
  backendOrigin: backend.origin,
  /** Qaysi server ishlatilyapti: `prod` / `test` / `custom` — diagnostika uchun. */
  backendServer: backend.name,
  isProduction: parsed.NODE_ENV === "production",
  telegramBotToken: parsed.TELEGRAM_BOT_TOKEN ?? null,
} as const;
