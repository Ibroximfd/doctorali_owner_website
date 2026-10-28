import "server-only";

import { z } from "zod";

import { isDemoMode } from "../../../config/servers.mjs";

import { resolveBackend } from "./backend-server";

/** Faqat serverda o'qiladigan sozlamalar. Brauzer bundle'iga tushmaydi. */
const schema = z.object({
  /**
   * Nomlanganlardan boshqa manzil (ixtiyoriy, serverdan ustun turadi). Faqat origin, yo'lsiz.
   * Qaysi nomlangan server — `APP_SERVER`; uni `config/servers.mjs` o'zi o'qiydi va tekshiradi.
   */
  BACKEND_ORIGIN: z.string().url().optional(),
  NODE_ENV: z.string().default("development"),
});

const parsed = schema.parse({
  BACKEND_ORIGIN: process.env.BACKEND_ORIGIN || undefined,
  NODE_ENV: process.env.NODE_ENV,
});

const backend = resolveBackend({ origin: parsed.BACKEND_ORIGIN });

export const serverEnv = {
  /** BFF murojaat qiladigan backend (`config/servers.mjs` — yagona manba). */
  backendOrigin: backend.origin,
  /** Qaysi server ishlatilyapti: `prod` / `test` / `custom` — diagnostika uchun. */
  backendServer: backend.name,
  isProduction: parsed.NODE_ENV === "production",
  /** Demo: BFF backend o'rniga ichki namuna bazadan javob beradi (`config/servers.mjs`). */
  isDemo: isDemoMode(),
} as const;
