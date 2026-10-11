import { SEQ_BG } from "@/shared/config/chart-palette";

import type { Cohort, CustomerRegion } from "./customers.schema";

/**
 * Kogorta katagi rangi (ketma-ket shkala qadami, 0–5). 0-oy har doim 100% —
 * u eng to'q qadamni oladi; qolgan oylar uchun shkala 9 foizlik qadamlarga
 * bo'linadi, chunki qaytish odatda 15–45% oralig'ida — shunda farqlar ko'rinadi.
 */
const RETENTION_STEP_PCT = 9;
const FULL_RETENTION_PCT = 100;
const TOP_STEP = SEQ_BG.length - 1;

export const retentionStep = (percent: number): number => {
  if (percent >= FULL_RETENTION_PCT) return TOP_STEP;
  return Math.max(0, Math.min(TOP_STEP - 1, Math.ceil(percent / RETENTION_STEP_PCT) - 1));
};

/** Kogortadan shu oyda qaytgan mijozlar soni. */
export const retainedCustomers = (size: number, percent: number): number =>
  Math.round((size * percent) / 100);

/** Jadval ustunlari: 0-oydan eng uzun kogortaning oxirgi oyigacha. */
export const cohortMonths = (cohorts: readonly Cohort[]): number[] =>
  Array.from(
    { length: Math.max(0, ...cohorts.map((cohort) => cohort.retention.length)) },
    (_, index) => index,
  );

/** Yangi/qaytgan seriyalari har doim bir xil rangda (seriya rangi indeksi). */
export const MIX_SERIES_COLOR = { returning: 0, new: 1 } as const;
export type MixSeriesKey = keyof typeof MIX_SERIES_COLOR;

export const isMixSeries = (key: string): key is MixSeriesKey => key in MIX_SERIES_COLOR;

export const TOP_REGIONS_LIMIT = 7;

/** Mijozi eng ko'p hududlar; ulush — ko'rsatilganlarga emas, barcha hududlar jamiga nisbatan. */
export const topRegions = (
  regions: readonly CustomerRegion[],
  limit: number = TOP_REGIONS_LIMIT,
): (CustomerRegion & { sharePct: number })[] => {
  const total = regions.reduce((sum, region) => sum + region.customers, 0);

  return [...regions]
    .sort((a, b) => b.customers - a.customers)
    .slice(0, limit)
    .map((region) => ({ ...region, sharePct: total > 0 ? (region.customers / total) * 100 : 0 }));
};
