/**
 * Grafik ranglari. Kategorik tartib qat'iy (validator bilan tekshirilgan): rang
 * obyektga biriktiriladi, tartibga emas — filtr o'zgarsa qolganlar rangini saqlaydi.
 * 8 tadan ortiq seriya uchun yangi rang o'ylab topilmaydi ("Boshqa" ga yig'iladi).
 */
export const SERIES_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
] as const;

export const SERIES_BG = [
  "bg-series-1",
  "bg-series-2",
  "bg-series-3",
  "bg-series-4",
  "bg-series-5",
  "bg-series-6",
  "bg-series-7",
  "bg-series-8",
] as const;

/** Ketma-ket (bitta rang, ochdan to'qqa) — issiqlik jadvali, hududlar, kogorta. */
export const SEQ_BG = ["bg-seq-1", "bg-seq-2", "bg-seq-3", "bg-seq-4", "bg-seq-5", "bg-seq-6"] as const;
/** Har qadam ustidagi matn rangi (kontrast uchun). */
export const SEQ_TEXT = [
  "text-seq-lo",
  "text-seq-lo",
  "text-seq-lo",
  "text-seq-mid",
  "text-seq-hi",
  "text-seq-hi",
] as const;

export const seriesColor = (index: number): string =>
  SERIES_COLORS[index % SERIES_COLORS.length] ?? SERIES_COLORS[0];
export const seriesBg = (index: number): string => SERIES_BG[index % SERIES_BG.length] ?? SERIES_BG[0];

/** Qiymatni 0..5 qadamga tushiradi (`max` ga nisbatan). */
export const seqStep = (value: number, max: number): number => {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(SEQ_BG.length - 1, Math.floor((value / max) * SEQ_BG.length)));
};

/** Tushum kanallari har sahifada bir xil rangda. */
export const CHANNEL_COLOR = { delivery: 0, clinic: 1, consultation: 2 } as const;
export type ChannelKey = keyof typeof CHANNEL_COLOR;

/** Holat ranglari seriya sifatida (yetkazildi / atkaz kabi ma'noli seriyalar). */
export const STATUS_COLORS = {
  delivered: "var(--order-delivered)",
  cancelled: "var(--order-cancelled)",
  pending: "var(--order-pending)",
  confirmed: "var(--order-confirmed)",
  shipping: "var(--order-shipping)",
  compare: "var(--cmp)",
} as const;
