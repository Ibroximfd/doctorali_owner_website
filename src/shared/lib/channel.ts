import { CHANNEL_COOKIE, TELEGRAM_CHANNEL } from "@/shared/config/session";
import { TELEGRAM_ENTRY, routes } from "@/shared/config/routes";

/** Joriy sessiya Telegram mini app orqali (PIN bilan) ochilganmi. Faqat brauzerda. */
export const isTelegramChannel = (): boolean =>
  typeof document !== "undefined" &&
  document.cookie.split("; ").some((cookie) => cookie === `${CHANNEL_COOKIE}=${TELEGRAM_CHANNEL}`);

export const telegramEntryHref = (next?: string): string =>
  next && next !== routes.overview ? `${TELEGRAM_ENTRY}?next=${encodeURIComponent(next)}` : TELEGRAM_ENTRY;

/** Sessiya tugaganda qayerga: Telegramda — PIN ekraniga, saytda — kirish sahifasiga. */
export const signInHref = (next: string): string =>
  isTelegramChannel() ? telegramEntryHref(next) : `${routes.login}?next=${encodeURIComponent(next)}`;
