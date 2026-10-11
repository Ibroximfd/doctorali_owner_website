import type { AppError } from "@/shared/lib/app-error";

/** Mini app shuncha vaqt fonda tursa qaytganda PIN qayta so'raladi. */
export const LOCK_AFTER_BACKGROUND_MS = 60_000;
/** Telegramda shuncha vaqt hech narsa bosilmasa — qulflash (PIN qayta so'raladi). */
export const TELEGRAM_IDLE_LOCK_MS = 5 * 60_000;

export type PinFailure = "invalid" | "locked" | "unlinked" | "initData" | "offline" | "server";

/** PIN bilan kirish xatosi → ekranda nima bo'ladi. */
export const pinFailureOf = (error: AppError): PinFailure => {
  if (error.code === "pin_invalid") return "invalid";
  if (error.code === "pin_locked") return "locked";
  if (error.code === "telegram_not_linked") return "unlinked";
  if (error.code?.startsWith("init_data_")) return "initData";
  return error.kind === "offline" ? "offline" : "server";
};

export type LinkFailure = "weak" | "alreadyLinked" | "reauth" | "initData" | "offline" | "server";

/** Bog'lash xatosi → qaysi qadamga qaytiladi. */
export const linkFailureOf = (error: AppError): LinkFailure => {
  if (error.code === "pin_weak") return "weak";
  if (error.code === "telegram_already_linked") return "alreadyLinked";
  if (error.code === "reauth_required" || error.kind === "unauthorized") return "reauth";
  if (error.code?.startsWith("init_data_")) return "initData";
  return error.kind === "offline" ? "offline" : "server";
};

/** Qulf tugashiga qolgan vaqt (daqiqa:soniya); o'tgan bo'lsa — `null`. */
export const lockRemaining = (
  lockedUntil: string,
  now: number,
): { minutes: number; seconds: number } | null => {
  const left = Math.ceil((Date.parse(lockedUntil) - now) / 1000);
  if (!Number.isFinite(left) || left <= 0) return null;
  return { minutes: Math.floor(left / 60), seconds: left % 60 };
};
