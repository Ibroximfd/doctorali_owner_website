import { PIN_LOCK_MINUTES, PIN_MAX_ATTEMPTS, isWeakPin } from "@/shared/domain/telegram-pin";
import { parseInitData } from "@/shared/lib/telegram-init-data";

import type { MockContext } from "../engine";
import { mockError, mockResponse, type MockHandler } from "../types";

/**
 * Telegram orqali kirish (`doctor_ali_owner_bot/docs/02_BACKEND_TZ.md` §3) —
 * backend tayyor bo'lguncha. Bog'lanishlar server jarayoni xotirasida: qayta
 * ishga tushirilsa hammasi "bog'lanmagan" holatiga qaytadi.
 */
type Link = { pin: string; failed: number; lockedUntil: number | null };

const links = new Map<number, Link>();

const SAMPLE_USER = {
  id: 1,
  full_name: "Boshliq",
  role: "owner",
  sections: [],
  filials: [],
  mask_pii: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const telegramIdOf = (ctx: MockContext): number | null => {
  const raw = isRecord(ctx.body) ? ctx.body.init_data : undefined;
  return typeof raw === "string" ? (parseInitData(raw)?.user.id ?? null) : null;
};

const pinOf = (ctx: MockContext): string | null => {
  const pin = isRecord(ctx.body) ? ctx.body.pin : undefined;
  return typeof pin === "string" ? pin : null;
};

/** Qulf vaqti o'tgan bo'lsa — hisob noldan. */
const releaseExpiredLock = (link: Link, now: number): void => {
  if (link.lockedUntil !== null && link.lockedUntil <= now) {
    link.lockedUntil = null;
    link.failed = 0;
  }
};

const iso = (time: number): string => new Date(time).toISOString();

export const telegramHandlers: MockHandler[] = [
  {
    method: "POST",
    path: "telegram/status/",
    resolve: (ctx) => {
      const telegramId = telegramIdOf(ctx);
      if (telegramId === null) return mockError(400, "init_data_invalid");

      const link = links.get(telegramId);
      if (!link) return { state: "unlinked", full_name: null, attempts_left: null, locked_until: null };

      releaseExpiredLock(link, ctx.now.getTime());
      return link.lockedUntil === null
        ? {
            state: "pin_required",
            full_name: SAMPLE_USER.full_name,
            attempts_left: PIN_MAX_ATTEMPTS - link.failed,
            locked_until: null,
          }
        : {
            state: "locked",
            full_name: SAMPLE_USER.full_name,
            attempts_left: 0,
            locked_until: iso(link.lockedUntil),
          };
    },
  },
  {
    method: "POST",
    path: "telegram/login/",
    resolve: (ctx) => {
      const telegramId = telegramIdOf(ctx);
      if (telegramId === null) return mockError(400, "init_data_invalid");
      const link = links.get(telegramId);
      if (!link) return mockError(404, "telegram_not_linked");

      const now = ctx.now.getTime();
      releaseExpiredLock(link, now);
      if (link.lockedUntil !== null)
        return mockResponse(423, {
          code: "pin_locked",
          detail: "pin_locked",
          locked_until: iso(link.lockedUntil),
        });

      if (pinOf(ctx) !== link.pin) {
        link.failed += 1;
        if (link.failed < PIN_MAX_ATTEMPTS)
          return mockResponse(401, {
            code: "pin_invalid",
            detail: "pin_invalid",
            attempts_left: PIN_MAX_ATTEMPTS - link.failed,
          });
        link.lockedUntil = now + PIN_LOCK_MINUTES * 60_000;
        return mockResponse(423, {
          code: "pin_locked",
          detail: "pin_locked",
          locked_until: iso(link.lockedUntil),
        });
      }

      link.failed = 0;
      return { access: "sample-access", refresh: "sample-refresh", user: SAMPLE_USER };
    },
  },
  {
    method: "POST",
    path: "telegram/link/",
    resolve: (ctx) => {
      const telegramId = telegramIdOf(ctx);
      if (telegramId === null) return mockError(400, "init_data_invalid");
      const pin = pinOf(ctx);
      if (pin === null || isWeakPin(pin)) return mockError(400, "pin_weak");

      links.set(telegramId, { pin, failed: 0, lockedUntil: null });
      return { ok: true };
    },
  },
];

/** Faqat testlar uchun: hamma bog'lanishlarni o'chiradi. */
export const resetTelegramMock = (): void => links.clear();
