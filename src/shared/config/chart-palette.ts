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

/** Xarita maydonlari (SVG): ketma-ket shkala — miqdor (kam → ko'p). */
export const SEQ_FILL = [
  "fill-seq-1",
  "fill-seq-2",
  "fill-seq-3",
  "fill-seq-4",
  "fill-seq-5",
  "fill-seq-6",
] as const;

/** Xarita maydonlari (SVG): kategorik guruh (bitta sklad viloyatlari — bitta rang). Tartib qat'iy. */
export const SERIES_FILL = [
  "fill-series-1/70",
  "fill-series-2/70",
  "fill-series-3/70",
  "fill-series-4/70",
  "fill-series-5/70",
  "fill-series-6/70",
  "fill-series-7/70",
  "fill-series-8/70",
] as const;

export const seriesFill = (index: number): string =>
  SERIES_FILL[index % SERIES_FILL.length] ?? SERIES_FILL[0];

/** Qiymatni 0..5 qadamga tushiradi (`max` ga nisbatan). */
export const seqStep = (value: number, max: number): number => {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(SEQ_BG.length - 1, Math.floor((value / max) * SEQ_BG.length)));
};

/** Holat ranglari seriya sifatida (yetkazildi / atkaz kabi ma'noli seriyalar). */
export const STATUS_COLORS = {
  delivered: "var(--order-delivered)",
  cancelled: "var(--order-cancelled)",
  pending: "var(--order-pending)",
  confirmed: "var(--order-confirmed)",
  shipping: "var(--order-shipping)",
  compare: "var(--cmp)",
} as const;

/**
 * Pul zanjiri (tuzilma v2 §6) har bo'limda bir xil rangda: kuryerda → bosh kuryerda →
 * filialga topshirildi. Rang holat emas, joy — shuning uchun kategorik seriya ranglari.
 */
export const MONEY_LOCATION_BG = {
  atCouriers: "bg-series-4",
  atChiefs: "bg-series-1",
  handed: "bg-series-3",
} as const;
export type MoneyLocation = keyof typeof MONEY_LOCATION_BG;
