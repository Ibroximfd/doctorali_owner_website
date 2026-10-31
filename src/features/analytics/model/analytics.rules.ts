import type { OperatorRow, ProductRow } from "./analytics.schema";

/** Filial ichidagi operatorlar: konversiya bo'yicha (eng yuqorisi tepada). */
export const operatorsOf = (rows: readonly OperatorRow[], filialId: number): OperatorRow[] =>
  rows
    .filter((row) => row.filialId === filialId)
    .sort((a, b) => (b.conversionPct ?? -1) - (a.conversionPct ?? -1));

/** Filial o'rtachasidan farq (foiz punktida) — operator jamoasidan qanchalik oldinda/orqada. */
export const versusAverage = (value: number | null, average: number | null): number | null =>
  value === null || average === null ? null : Math.round((value - average) * 10) / 10;

/** Mahsulotlar sotuv bo'yicha; atkazi eng yuqori mahsulot — e'tibor belgisi uchun. */
export const rankProducts = (rows: readonly ProductRow[]) => {
  const worst = [...rows].sort((a, b) => (b.cancelRatePct ?? 0) - (a.cancelRatePct ?? 0))[0]?.id ?? null;
  return { rows: [...rows].sort((a, b) => b.sold - a.sold), worstId: worst };
};
