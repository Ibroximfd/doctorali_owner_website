import type { Session } from "./settings.schema";

/** `iPhone 15 · Safari` — brauzer noma'lum bo'lsa faqat qurilma. */
export const sessionLabel = (session: Pick<Session, "device" | "browser">): string =>
  session.browser ? `${session.device} · ${session.browser}` : session.device;
