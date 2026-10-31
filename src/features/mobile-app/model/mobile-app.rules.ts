import type { AppOperator } from "./mobile-app.schema";

export const OPERATOR_SORTS = ["invited", "ordered", "rate", "name"] as const;
export type OperatorSort = (typeof OPERATOR_SORTS)[number];

/** Olib kirganlardan zakaz berganlar ulushi (%); hech kim olib kirilmagan bo'lsa — `null`. */
export const orderedRate = (row: Pick<AppOperator, "invited" | "ordered">): number | null =>
  row.invited > 0 ? Math.round((row.ordered / row.invited) * 1000) / 10 : null;

/** Filial bo'yicha filtr (`null` — hammasi) va tartib (son — kamayish, ism — alifbo). */
export const operatorRows = (
  rows: readonly AppOperator[],
  filialId: number | null,
  sort: OperatorSort,
): AppOperator[] =>
  rows
    .filter((row) => filialId === null || row.filialId === filialId)
    .sort((a, b) => {
      if (sort === "name") return a.fullName.localeCompare(b.fullName);
      if (sort === "rate") return (orderedRate(b) ?? -1) - (orderedRate(a) ?? -1);
      return b[sort] - a[sort];
    });
