import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { TIME_ZONE } from "@/shared/lib/format";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./locales";
import { loadMessages } from "./messages";

/**
 * Til URL da emas, cookie da: panel ichki vosita, havolalar til bo'yicha
 * ajralmaydi. Brauzer tili hisobga olinmaydi — boshliq tanlagani saqlanadi.
 */
export default getRequestConfig(async () => {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(stored) ? stored : DEFAULT_LOCALE;

  return { locale, timeZone: TIME_ZONE, messages: await loadMessages(locale) };
});
