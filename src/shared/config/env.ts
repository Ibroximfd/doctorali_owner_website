import { z } from "zod";

/**
 * Brauzerga ham ko'rinadigan sozlamalar (`NEXT_PUBLIC_*`). Server sirlari —
 * `env.server.ts` da. Qiymatlar modul yuklanishida bir marta tekshiriladi.
 */
const schema = z.object({
  NEXT_PUBLIC_WS_URL: z.string().url().optional(),
});

const parsed = schema.parse({
  // Next `NEXT_PUBLIC_*` ni faqat to'liq yozilgan `process.env.X` ko'rinishida inline qiladi.
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || undefined,
});

export const env = {
  wsUrl: parsed.NEXT_PUBLIC_WS_URL ?? null,
} as const;
