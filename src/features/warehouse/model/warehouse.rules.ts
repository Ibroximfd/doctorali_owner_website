/** Qoldiq holati (backend hisoblaydi): yomonidan yaxshisiga. */
export const STOCK_STATUSES = ["out", "critical", "low", "ok", "empty"] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const isStockStatus = (value: string): value is StockStatus =>
  STOCK_STATUSES.some((known) => known === value);

/** Muammoli qoldiq: tugagan yoki kritik. */
export const isProblemStock = (status: string): boolean => status === "out" || status === "critical";

/** Saralash og'irligi: noma'lum holat oxirida. */
export const stockRank = (status: string): number => {
  const index = STOCK_STATUSES.findIndex((known) => known === status);
  return index === -1 ? STOCK_STATUSES.length : index;
};

/** Ombor kartasidagi «to'lish» chizig'i: 30 kun — to'liq (100%). */
export const COVER_FULL_DAYS = 30;

export const coverPercent = (days: number | null): number =>
  days === null ? 0 : Math.max(0, Math.min(100, Math.round((days / COVER_FULL_DAYS) * 100)));

/** Marketplace (ERP) dan kelgan ombor — alohida belgi bilan ko'rsatiladi. */
export const isMarketplace = (source: string): boolean => source === "marketplace";

type RunwayCandidate = { status: string; daysOfCover: number | null };

/**
 * «Tugash vaqti» shkalasi qatorlari: tugagan yoki chiqimi bor (kunlari o'lchanadigan) mahsulotlar,
 * eng tez tugaydigani birinchi. Chiqimsiz (`daysOfCover = null`) qoldiq shkalaga tushmaydi.
 */
export const runwayRows = <T extends RunwayCandidate>(rows: readonly T[]): T[] =>
  rows
    .filter((row) => row.status === "out" || row.daysOfCover !== null)
    .map((row) => ({ row, days: row.status === "out" ? 0 : (row.daysOfCover ?? 0) }))
    .sort((a, b) => a.days - b.days)
    .map(({ row }) => row);
