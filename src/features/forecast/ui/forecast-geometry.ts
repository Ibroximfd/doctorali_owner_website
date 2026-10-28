import type { ForecastSeries } from "../model/forecast.schema";

/**
 * 50% oraliq API da yo'q — 80% oraliqdan normal taqsimot nisbati bilan hosil qilinadi:
 * z(0,75) / z(0,90) = 0,674 / 1,2816. Ichki (to'qroq) konus shu.
 */
export const INNER_BAND_RATIO = 0.674 / 1.2816;

export type Box = { width: number; height: number };
export type Point = { x: number; y: number };
export type Tick = { value: number; y: number };
export type XLabel = { index: number; x: number; anchor: "start" | "middle" | "end" };

export type ForecastGeometry = {
  /** Chizish maydoni (o'q yozuvlari uchun chetlar ayirilgan). */
  plot: { left: number; right: number; top: number; bottom: number };
  actualPath: string;
  forecastPath: string;
  outerBand: string;
  innerBand: string;
  today: Point | null;
  ticks: Tick[];
  xLabels: XLabel[];
  /** Fakt cho'qqisi va ufq oxiri — izoh plitkalari shu nuqtalarda. */
  peak: (Point & { index: number; value: number }) | null;
  end: (Point & { index: number; value: number }) | null;
  /** Kursor x → eng yaqin kun indeksi. */
  indexAt: (x: number) => number;
  xOf: (index: number) => number;
  yOf: (value: number) => number;
};

const PAD = { left: 52, right: 12, top: 16, bottom: 28 } as const;

/** 1-2-5 qadamli «chiroyli» o'q bo'linmalari. */
export const niceTicks = (min: number, max: number, count = 4): number[] => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const raw = (max - min) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((factor) => factor * power >= raw) ?? 10) * power;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [start];
  // oxirgi bo'linma maksimumdan kichik bo'lmaydi — chiziq grafik ustidan chiqmaydi
  while ((ticks.at(-1) ?? max) < max) ticks.push(Math.round(((ticks.at(-1) ?? start) + step) * 1e6) / 1e6);
  return ticks;
};

const toPath = (points: readonly Point[]): string =>
  points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");

const toArea = (upper: readonly Point[], lower: readonly Point[]): string =>
  upper.length === 0 ? "" : `${toPath([...upper, ...[...lower].reverse()])} Z`;

/** Ketma-ketlikdan grafik shakllari: fakt, prognoz, ikki qatlamli konus, «bugun», o'q bo'linmalari. */
export const buildForecastGeometry = (series: ForecastSeries, box: Box): ForecastGeometry => {
  const count = series.labels.length;
  const plot = {
    left: PAD.left,
    right: Math.max(PAD.left + 1, box.width - PAD.right),
    top: PAD.top,
    bottom: Math.max(PAD.top + 1, box.height - PAD.bottom),
  };

  const values = [...series.actual, ...series.low, ...series.high, ...series.forecast].filter(
    (value): value is number => value !== null,
  );
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const domainMin = ticks[0] ?? 0;
  const domainMax = ticks.at(-1) ?? 1;
  const span = domainMax - domainMin || 1;

  const xOf = (index: number) =>
    count <= 1 ? plot.left : plot.left + (index / (count - 1)) * (plot.right - plot.left);
  const yOf = (value: number) => plot.bottom - ((value - domainMin) / span) * (plot.bottom - plot.top);

  const pointsOf = (items: readonly (number | null)[], from = 0) =>
    items.flatMap((value, index) =>
      index < from || value === null ? [] : [{ x: xOf(index), y: yOf(value), index, value }],
    );

  const todayIndex = Math.min(Math.max(series.todayIndex, 0), count - 1);
  const actual = pointsOf(series.actual).filter((point) => point.index <= todayIndex);
  const forecast = pointsOf(series.forecast, todayIndex);

  const bandAt = (ratio: number) => {
    const upper: Point[] = [];
    const lower: Point[] = [];
    for (let index = todayIndex; index < count; index += 1) {
      const mid = series.forecast[index];
      const low = series.low[index];
      const high = series.high[index];
      if (mid == null || low == null || high == null) continue;
      upper.push({ x: xOf(index), y: yOf(mid + (high - mid) * ratio) });
      lower.push({ x: xOf(index), y: yOf(mid - (mid - low) * ratio) });
    }
    return toArea(upper, lower);
  };

  const todayValue = series.actual[todayIndex] ?? series.forecast[todayIndex] ?? null;
  const peak = actual.reduce<(typeof actual)[number] | null>(
    (best, point) => (best === null || point.value > best.value ? point : best),
    null,
  );
  const end = forecast.length > 1 ? (forecast.at(-1) ?? null) : null;

  const labelIndexes = [0, todayIndex, count - 1];
  if (box.width >= 640 && todayIndex > 8) labelIndexes.splice(1, 0, Math.round(todayIndex / 2));
  const xLabels = [...new Set(labelIndexes)]
    .filter((index) => index >= 0 && index < count)
    .map((index): XLabel => ({
      index,
      x: xOf(index),
      anchor: index === 0 ? "start" : index === count - 1 ? "end" : "middle",
    }));

  return {
    plot,
    actualPath: toPath(actual),
    forecastPath: forecast.length > 1 ? toPath(forecast) : "",
    outerBand: bandAt(1),
    innerBand: bandAt(INNER_BAND_RATIO),
    today: todayValue === null ? null : { x: xOf(todayIndex), y: yOf(todayValue) },
    ticks: ticks.map((value) => ({ value, y: yOf(value) })),
    xLabels,
    peak,
    end,
    indexAt: (x: number) =>
      count <= 1
        ? 0
        : Math.min(
            count - 1,
            Math.max(0, Math.round(((x - plot.left) / (plot.right - plot.left)) * (count - 1))),
          ),
    xOf,
    yOf,
  };
};
