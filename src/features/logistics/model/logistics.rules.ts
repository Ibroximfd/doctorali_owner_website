import type { Timeseries } from "@/shared/lib/envelope";

import type { Courier } from "./logistics.schema";

const DAY_MS = 86_400_000;

/**
 * Eng eski topshirilmagan naqd necha to'liq sutkadan beri kuryerda turibdi.
 * `now` — javob tuzilgan vaqt (`generated_at`), brauzer soati emas.
 */
export const unsettledDays = (oldestUnsettledAt: string | null, now: string): number | null => {
  if (oldestUnsettledAt === null) return null;
  return Math.max(0, Math.floor((Date.parse(now) - Date.parse(oldestUnsettledAt)) / DAY_MS));
};

export type CodLevel = "none" | "today" | "yesterday" | "overdue";

/** Kuryerdagi naqd darajasi: bugungi — odatiy, kechadan — ogohlantirish, 2 kundan beri — kritik (`cod.unsettled`). */
export const codLevel = (
  courier: Pick<Courier, "codUnsettled" | "oldestUnsettledAt">,
  now: string,
): CodLevel => {
  if (courier.codUnsettled <= 0) return "none";
  const days = unsettledDays(courier.oldestUnsettledAt, now) ?? 0;
  if (days >= 2) return "overdue";
  return days === 1 ? "yesterday" : "today";
};

/** Kunlik grafikda faqat yakun seriyalari; `attempts` bitta o'qqa qo'shilmaydi — u alohida blokda. */
export const DAILY_SERIES_KEYS = ["delivered", "cancelled"] as const;
export type DailySeriesKey = (typeof DAILY_SERIES_KEYS)[number];

export const dailySeries = (timeseries: Timeseries): { key: DailySeriesKey; values: number[] }[] =>
  DAILY_SERIES_KEYS.flatMap((key) => {
    const series = timeseries.series.find((item) => item.key === key);
    return series ? [{ key, values: series.values }] : [];
  });

export const ATTEMPT_REASONS = ["client_unavailable", "wrong_address", "client_refused", "other"] as const;
export type AttemptReasonKey = (typeof ATTEMPT_REASONS)[number];

export const isAttemptReason = (reason: string): reason is AttemptReasonKey =>
  ATTEMPT_REASONS.some((known) => known === reason);

export const TRANSFER_STATUSES = ["pending", "in_transit", "received"] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const isTransferStatus = (status: string): status is TransferStatus =>
  TRANSFER_STATUSES.some((known) => known === status);

/** Hudud kodi → nomi (`meta` lug'atidan). Lug'at kelmagan yoki kod yangi bo'lsa — kodning o'zi. */
export const regionName = (
  code: string,
  regions: readonly { code: string; name: string }[] | undefined,
): string => regions?.find((region) => region.code === code)?.name ?? code;
