/** Grafiklar uchun yagona ma'lumot shakli — bitta o'q, bir nechta seriya. */
export type ChartSeries = {
  key: string;
  name: string;
  /** CSS rang (`var(--series-1)`), token orqali. */
  color: string;
  values: readonly number[];
  /** Chiziq ostini och rang bilan to'ldirish (bitta seriya uchun o'rinli). */
  area?: boolean;
};

export type ChartData = {
  /** Allaqachon formatlangan o'q yorliqlari (`03.09`, `09:00`). */
  labels: readonly string[];
  series: readonly ChartSeries[];
  /** Oldingi davr — sust kulrang chiziq. */
  compare?: { name: string; values: readonly number[] } | null;
};

export const COMPARE_KEY = "__compare";

export type ChartRow = { label: string } & Record<string, number | string>;

/** Recharts kutadigan qatorlar: har yorliq uchun `{ label, <seriya>: qiymat }`. */
export const toChartRows = (data: ChartData): ChartRow[] =>
  data.labels.map((label, index) => {
    const row: ChartRow = { label };
    for (const series of data.series) row[series.key] = series.values[index] ?? 0;
    if (data.compare) row[COMPARE_KEY] = data.compare.values[index] ?? 0;
    return row;
  });

export type ChartTable = { headers: string[]; rows: string[][] };

/** Grafikning jadval egizagi — tooltip qiymatni ko'rishning yagona yo'li bo'lmasligi uchun. */
export const toChartTable = (
  data: ChartData,
  columnLabel: string,
  formatValue: (value: number) => string,
): ChartTable => ({
  headers: [
    columnLabel,
    ...data.series.map((series) => series.name),
    ...(data.compare ? [data.compare.name] : []),
  ],
  rows: data.labels.map((label, index) => [
    label,
    ...data.series.map((series) => formatValue(series.values[index] ?? 0)),
    ...(data.compare ? [formatValue(data.compare.values[index] ?? 0)] : []),
  ]),
});

/** Har yorliqdagi seriyalar yig'indisi (ustma-ust ustunlar uchun). */
export const chartTotals = (data: ChartData): number[] =>
  data.labels.map((_, index) => data.series.reduce((sum, series) => sum + (series.values[index] ?? 0), 0));

export const isChartEmpty = (data: ChartData): boolean =>
  data.labels.length === 0 || data.series.every((series) => series.values.every((value) => value === 0));
