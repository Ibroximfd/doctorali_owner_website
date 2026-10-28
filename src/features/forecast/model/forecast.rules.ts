import type { ForecastSeries } from "./forecast.schema";

export const HORIZONS = [7, 30, 90] as const;
export type Horizon = (typeof HORIZONS)[number];

export const FORECAST_METRICS = ["revenue", "orders"] as const;
export type ForecastMetric = (typeof FORECAST_METRICS)[number];

export type ForecastRow = {
  label: string;
  actual: number | null;
  forecast: number | null;
  /** Oraliq maydoni: Recharts `[pastki, yuqori]` juftligini chizadi. */
  band: [number, number] | null;
  isFuture: boolean;
};

/** Massivlarni grafik qatorlariga aylantiradi (bitta `labels` o'qi). */
export const toForecastRows = (
  series: ForecastSeries,
  formatLabel: (label: string) => string,
): ForecastRow[] =>
  series.labels.map((label, index) => {
    const low = series.low[index] ?? null;
    const high = series.high[index] ?? null;
    return {
      label: formatLabel(label),
      actual: series.actual[index] ?? null,
      forecast: series.forecast[index] ?? null,
      band: low !== null && high !== null ? [low, high] : null,
      isFuture: index > series.todayIndex,
    };
  });

/** Oraliq kengligi kutilganga nisbatan, % — «qanchalik aniq» ko'rsatkichi. */
export const spreadPct = (range: { expected: number; low: number; high: number }): number | null =>
  range.expected > 0 ? Math.round(((range.high - range.low) / 2 / range.expected) * 1000) / 10 : null;
