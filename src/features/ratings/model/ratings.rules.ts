import type { CourierRow, Formula, FormulaMetric } from "./ratings.schema";

/**
 * Server formulasi bo'yicha tartib (§7.3–7.5): `direction: desc` — ko'p yaxshi, `asc` — kam yaxshi
 * (logist tezligi). `score: null` qatorlar HAR DOIM oxirida — reyting boshida «ma'lumot yo'q»
 * turmasin. Tenglarda server tartibi saqlanadi.
 */
export const sortByScore = <Row extends { score: number | null }>(
  rows: readonly Row[],
  direction: "asc" | "desc",
): Row[] =>
  rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      if (a.row.score === null || b.row.score === null) {
        if (a.row.score === b.row.score) return a.index - b.index;
        return a.row.score === null ? 1 : -1;
      }
      const diff = direction === "asc" ? a.row.score - b.row.score : b.row.score - a.row.score;
      return diff === 0 ? a.index - b.index : diff;
    })
    .map(({ row }) => row);

/** Formula bloki ichidan ko'rsatkich (`key` — backend nomi, `rating_avg`). */
export const formulaMetric = (formula: Formula, key: string): FormulaMetric | null =>
  key === "score" && formula.score
    ? formula.score
    : (formula.metrics.find((item) => item.key === key) ?? null);

/** Ustun sarlavhasi: serverning `name` i, bo'lmasa — mahalliy zaxira. */
export const metricTitle = (formula: Formula, key: string, fallback: string): string => {
  const name = formulaMetric(formula, key)?.name.trim();
  return name ? name : fallback;
};

/** Ekranda izohlanadigan ko'rsatkichlar: avval asosiy (`score`), keyin qolganlari, `how` borlari. */
export const explainedMetrics = (formula: Formula): FormulaMetric[] =>
  [formula.score, ...formula.metrics].filter(
    (item): item is FormulaMetric => item !== null && Boolean(item.how ?? item.nullWhen ?? item.note),
  );

/** «Faol»: hammasi · faqat faollar · faqat nofaollar. */
export const ACTIVITY = ["all", "active", "inactive"] as const;
export type Activity = (typeof ACTIVITY)[number];

/** Ro'yxat filtrlari (klientda — owner endpointi ularni hujjatda qabul qilmaydi). */
export type RowFilters = {
  q: string;
  /** Faqat bahosi (natijasi) borlar: `score !== null`. */
  rated: boolean;
  /** Kuryer viloyati kodi. */
  region: string | null;
  activity: Activity;
  /** Kuryer reytingi kamida shuncha (1–5); bahosizlar bu filtrda tushib qoladi. */
  minScore: number | null;
};

export const EMPTY_FILTERS: RowFilters = {
  q: "",
  rated: false,
  region: null,
  activity: "all",
  minScore: null,
};

export const hasFilters = (filters: RowFilters): boolean =>
  filters.q.trim() !== "" ||
  filters.rated ||
  filters.region !== null ||
  filters.activity !== "all" ||
  filters.minScore !== null;

const matchesName = (name: string, q: string): boolean =>
  q.trim() === "" || name.toLocaleLowerCase().includes(q.trim().toLocaleLowerCase());

/** Operator va logist qatorlari: ism va «bahosi bor». */
export const filterPeople = <Row extends { score: number | null }>(
  rows: readonly Row[],
  nameOf: (row: Row) => string,
  filters: Pick<RowFilters, "q" | "rated">,
): Row[] =>
  rows.filter((row) => matchesName(nameOf(row), filters.q) && (!filters.rated || row.score !== null));

export const filterCouriers = (rows: readonly CourierRow[], filters: RowFilters): CourierRow[] =>
  filterPeople(rows, (row) => row.courier.name, filters).filter(
    (row) =>
      (filters.region === null || row.courier.region === filters.region) &&
      (filters.activity === "all" || row.courier.isActive === (filters.activity === "active")) &&
      (filters.minScore === null || (row.score !== null && row.score >= filters.minScore)),
  );

/** Qatorlardagi viloyatlar (takrorsiz, tartib bilan) — viloyat tanlovi uchun. */
export const courierRegions = (rows: readonly CourierRow[]): string[] =>
  [...new Set(rows.flatMap((row) => (row.courier.region ? [row.courier.region] : [])))].sort();

/** Taqsimot ulushi (foiz) — jami 0 bo'lsa `null` (chizilmaydi, 0% emas). */
export const starShare = (distribution: Readonly<Record<string, number>>, star: string): number | null => {
  const total = Object.values(distribution).reduce((sum, value) => sum + value, 0);
  return total === 0 ? null : ((distribution[star] ?? 0) / total) * 100;
};
