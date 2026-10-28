import type { RegionTone } from "@/shared/ui/region-map";

import type { RegionRow } from "./regions.schema";

/** Xarita nimani bo'yaydi: yetkazish ulushi, ombor holati yoki kuryerlar bandligi. */
export const MAP_METRICS = ["delivery", "stock", "couriers"] as const;
export type MapMetric = (typeof MAP_METRICS)[number];

/** Rang ma'nosi metrikaga qarab; chegaralar: yetkazish 75/55/35, kuryer bandligi 75/50/25. */
export const metricTone = (row: RegionRow, metric: MapMetric): RegionTone => {
  if (metric === "stock") {
    if (row.stockUnits <= 0) return "none";
    return row.lowSkus === 0 ? "good" : row.lowSkus === 1 ? "watch" : "bad";
  }
  if (metric === "couriers") {
    if (row.couriersTotal === 0) return "none";
    const share = (row.couriersWorking / row.couriersTotal) * 100;
    if (share >= 75) return "good";
    if (share >= 50) return "fair";
    return share >= 25 ? "watch" : "bad";
  }
  if (row.orders === 0) return "none";
  if (row.successRate === null) return "pending";
  if (row.successRate >= 75) return "good";
  if (row.successRate >= 55) return "fair";
  return row.successRate >= 35 ? "watch" : "bad";
};

/** Hudud reytingi: ulush × log(hajm) — kichik hududdagi 100% katta hududdagi 95% dan yuqori chiqmasin. */
export const regionScore = (row: Pick<RegionRow, "successRate" | "orders">): number =>
  row.orders < 3 || row.successRate === null ? -1 : row.successRate * Math.log(row.orders + 1);

export const COURIER_STATUSES = ["moving", "idle", "no_signal", "off_shift"] as const;
export type CourierStatus = (typeof COURIER_STATUSES)[number];
export const isCourierStatus = (value: string): value is CourierStatus =>
  COURIER_STATUSES.some((known) => known === value);

export const TASK_KINDS = ["delivering", "returning", "pickup", "waiting"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];
export const isTaskKind = (value: string): value is TaskKind => TASK_KINDS.some((known) => known === value);

/** Kuryerdagi naqd ogohlantirishi (logistika bilan bir xil qoida): 10 mln+ yoki 24 soat+. */
export const isCashAlert = (
  courier: { cashOnHand: number; cashSince: string | null },
  now: number,
): boolean =>
  courier.cashOnHand > 10_000_000 ||
  (courier.cashOnHand > 0 &&
    courier.cashSince !== null &&
    now - Date.parse(courier.cashSince) > 24 * 3_600_000);
