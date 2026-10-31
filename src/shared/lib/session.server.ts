import "server-only";

import { cookies } from "next/headers";

import { serverEnv } from "@/shared/config/env.server";
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE_SECONDS,
  CHANNEL_COOKIE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE_SECONDS,
} from "@/shared/config/session";

/**
 * Sessiya tokenlari faqat shu yerda — httpOnly, SameSite=Strict cookie da.
 * Moliyaviy panel: token brauzer JS ga hech qachon berilmaydi.
 */
const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
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

/** Kirishda va token yangilanishida: refresh berilmasa eskisi qoladi. */
export const writeSession = async (tokens: { access: string; refresh?: string }): Promise<void> => {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.access, cookieOptions(ACCESS_MAX_AGE_SECONDS));
  if (tokens.refresh !== undefined)
    store.set(REFRESH_COOKIE, tokens.refresh, cookieOptions(REFRESH_MAX_AGE_SECONDS));
  store.delete(CHANNEL_COOKIE);
};

export const clearSession = async (): Promise<void> => {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(CHANNEL_COOKIE);
};
