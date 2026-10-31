import type { Overview } from "./overview.schema";

/** Pul qismlari tartibi: zanjir bo'yicha — mijozdan filialgacha (§6). */
export const MONEY_STEPS = ["atCouriers", "atChiefs", "handed"] as const;
export type MoneyStep = (typeof MONEY_STEPS)[number];

export const moneyTotal = (money: Overview["money"]): number =>
  MONEY_STEPS.reduce((sum, step) => sum + money[step], 0);

/** Filiallar tushum bo'yicha (eng kattasi tepada); ulush — jami tushumga nisbatan. */
export const rankFilials = <Row extends { revenue: number }>(rows: readonly Row[]) => {
  const total = rows.reduce((sum, row) => sum + row.revenue, 0);
  return [...rows]
    .sort((a, b) => b.revenue - a.revenue)
    .map((row) => ({ ...row, sharePct: total > 0 ? (row.revenue / total) * 100 : 0 }));
};

/** Eng past konversiyali filial (kamida 2 filial bo'lsa) — «e'tibor» belgisi uchun. */
export const weakestFilialId = (
  rows: readonly { id: number; conversionPct: number | null }[],
): number | null => {
  const scored = rows.filter((row) => row.conversionPct !== null);
  if (scored.length < 2) return null;
  return [...scored].sort((a, b) => (a.conversionPct ?? 0) - (b.conversionPct ?? 0))[0]?.id ?? null;
};
