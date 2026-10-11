"use server";

import { cookies } from "next/headers";

import { LOCALE_COOKIE, isLocale } from "./locales";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/** Interfeys tilini saqlaydi. Noma'lum qiymat e'tiborsiz qoladi (bu ochiq endpoint). */
export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR_SECONDS, sameSite: "lax" });
}
