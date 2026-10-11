import "server-only";

import { cookies } from "next/headers";

import { serverEnv } from "@/shared/config/env.server";
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE_SECONDS,
  CHANNEL_COOKIE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE_SECONDS,
  TELEGRAM_CHANNEL,
  TELEGRAM_REFRESH_MAX_AGE_SECONDS,
  type SessionChannel,
} from "@/shared/config/session";

/**
 * Sessiya tokenlari faqat shu yerda — httpOnly, SameSite=Strict cookie da.
 * Moliyaviy panel: token brauzer JS ga hech qachon berilmaydi.
 */
const cookieOptions = (maxAge: number, httpOnly = true) => ({
  httpOnly,
  secure: serverEnv.isProduction,
  sameSite: "strict" as const,
  path: "/",
  maxAge,
});

export type SessionTokens = { access: string | null; refresh: string | null };

export const readSession = async (): Promise<SessionTokens> => {
  const store = await cookies();
  return {
    access: store.get(ACCESS_COOKIE)?.value ?? null,
    refresh: store.get(REFRESH_COOKIE)?.value ?? null,
  };
};

/**
 * `channel` faqat yangi kirishda beriladi (parol+SMS yoki Telegram+PIN); token
 * yangilanishida berilmaydi — kanal belgisi va muddati o'zgarmay qoladi.
 */
export const writeSession = async (
  tokens: { access: string; refresh?: string },
  channel?: SessionChannel,
): Promise<void> => {
  const store = await cookies();
  const isTelegram = channel === "telegram" || store.get(CHANNEL_COOKIE)?.value === TELEGRAM_CHANNEL;
  const refreshMaxAge = isTelegram ? TELEGRAM_REFRESH_MAX_AGE_SECONDS : REFRESH_MAX_AGE_SECONDS;

  store.set(ACCESS_COOKIE, tokens.access, cookieOptions(ACCESS_MAX_AGE_SECONDS));
  if (tokens.refresh !== undefined) store.set(REFRESH_COOKIE, tokens.refresh, cookieOptions(refreshMaxAge));

  if (channel === "telegram")
    store.set(CHANNEL_COOKIE, TELEGRAM_CHANNEL, cookieOptions(TELEGRAM_REFRESH_MAX_AGE_SECONDS, false));
  else if (channel === "web") store.delete(CHANNEL_COOKIE);
};

export const clearSession = async (): Promise<void> => {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(CHANNEL_COOKIE);
};
