import { CHANNEL_COLOR, type ChannelKey } from "@/shared/config/chart-palette";
import { metricAmount } from "@/shared/lib/envelope";

import type { Overview } from "./overview.schema";

export const CHANNEL_KEYS = ["delivery", "clinic", "consultation"] as const satisfies readonly ChannelKey[];

/** Tushumi bor kanallar (filial tanlanganda onlayn konsultatsiya bo'lmasligi mumkin). */
export const activeChannels = (
  revenue: Overview["revenue"],
): { key: ChannelKey; value: number; colorIndex: number }[] =>
  CHANNEL_KEYS.map((key) => ({
    key,
    value: metricAmount(revenue[key]),
    colorIndex: CHANNEL_COLOR[key],
  })).filter((channel) => channel.value > 0);

/** Reja sur'ati: bajarilgan foiz bilan bugungi kunga kutilgan foiz orasidagi farq (foiz punkti). */
export const planPace = (plan: NonNullable<Overview["plan"]>): { gap: number; isAhead: boolean } => {
  const gap = Math.round((plan.pct - plan.expectedPct) * 10) / 10;
  return { gap: Math.abs(gap), isAhead: gap >= 0 };
};

/** Lenta hodisasi turi → nuqta rangi (Tailwind klassi). Noma'lum tur neytral. */
const FEED_DOT: Record<string, string> = {
  "order.created": "bg-order-pending",
  "order.confirmed": "bg-order-confirmed",
  "order.shipping": "bg-order-shipping",
  "order.delivered": "bg-order-delivered",
  "order.cancelled": "bg-order-cancelled",
  "clinic.payment": "bg-series-2",
  "consultation.paid": "bg-series-3",
  "cod.settled": "bg-series-1",
  "alert.opened": "bg-crit",
};

export const feedDotClass = (kind: string): string => FEED_DOT[kind] ?? "bg-ink-3";

/** "Kechikkan" izohi faqat jarayondagi bosqichlarda ma'noli. */
export const STALE_STAGES = ["pending", "confirmed", "shipping"] as const;
export const isStaleStage = (status: string): status is (typeof STALE_STAGES)[number] =>
  (STALE_STAGES as readonly string[]).includes(status);

/** Bugungi tushum kechagi shu vaqtga nisbatan: ±1% dan kichik farq — «kechagi sur'atda». */
export type TodayTrend = { kind: "up" | "down" | "flat" | "none"; pct: number };
const FLAT_PCT = 1;

export const todayTrend = (quick: Overview["revenueQuick"]): TodayTrend => {
  if (quick.todaySameTimeYesterday <= 0) return { kind: "none", pct: 0 };
  const pct = ((quick.today - quick.todaySameTimeYesterday) / quick.todaySameTimeYesterday) * 100;
  if (Math.abs(pct) < FLAT_PCT) return { kind: "flat", pct: 0 };
  return { kind: pct > 0 ? "up" : "down", pct: Math.abs(pct) };
};

/** Ustma-ust maydon grafigi uchun: har seriya o'zidan oldingilar ustiga qo'shiladi. */
export const stackSeries = (series: readonly { values: readonly number[] }[]): number[][] => {
  const length = Math.max(0, ...series.map((item) => item.values.length));
  const running = Array.from({ length }, () => 0);
  return series.map((item) =>
    running.map((base, index) => {
      const next = base + Math.max(0, item.values[index] ?? 0);
      running[index] = next;
      return next;
    }),
  );
};
