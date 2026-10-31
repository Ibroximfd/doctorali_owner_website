import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { num, optNum, str } from "@/shared/lib/lenient";

import type { Leaderboard, StaffProfile, Team } from "./staff.schema";

/**
 * Xodimlar — `GET /api/owner/sales/operators/` (B-15: `/api/owner/staff/*` backendda yo'q).
 * Jonli javob (2026-10-31): konvert, `data: [{id, full_name, filial (nom), is_online, leads,
 * conversion_pct, orders_created, orders_delivered, sales_amount, commission_earned, calls,
 * missed_unhandled, activities_overdue, rating_avg, rating_count}]`. Logistlar uchun manba yo'q.
 *
 * Reyting shu ro'yxatdan quriladi: o'rin — sotuv summasi bo'yicha; «ball» — eng yaxshi sotuvchiga
 * nisbatan ulush (0–100), backend ballari yo'q. Jamoa = filial (nomi bo'yicha).
 */
export const salesOperatorsSchema = z.array(
  z.object({
    id: num,
    full_name: str,
    filial: z.preprocess(
      (raw) =>
        typeof raw === "object" && raw !== null && "name" in raw ? (raw as { name: unknown }).name : raw,
      z.string().nullable().default(null),
    ),
    is_online: z.boolean().default(false),
    leads: num,
    conversion_pct: optNum,
    orders_created: num,
    orders_delivered: num,
    sales_amount: num,
    commission_earned: num,
    calls: num,
    missed_unhandled: num,
    activities_overdue: num,
    rating_avg: optNum,
    rating_count: num,
  }),
);
export type SalesOperator = Camelized<z.infer<typeof salesOperatorsSchema>>[number];

export const OPERATOR_COLUMNS: Leaderboard["columns"] = [
  { key: "sales_amount", unit: "uzs", better: "higher" },
  { key: "orders_delivered", unit: "count", better: "higher" },
  { key: "conversion_pct", unit: "pct", better: "higher" },
  { key: "leads", unit: "count", better: "higher" },
  { key: "calls", unit: "count", better: "higher" },
  { key: "missed_unhandled", unit: "count", better: "lower" },
  { key: "rating_avg", unit: "rating", better: "higher" },
];

const metricsOf = (row: SalesOperator): Record<string, number | null> => ({
  salesAmount: row.salesAmount,
  ordersDelivered: row.ordersDelivered,
  conversionPct: row.conversionPct,
  leads: row.leads,
  calls: row.calls,
  missedUnhandled: row.missedUnhandled,
  ratingAvg: row.ratingAvg,
});

/** Jamoa id si — filial nomlari alifbo tartibida (1 dan); filialsiz — 0. */
const teamIds = (rows: readonly SalesOperator[]): Map<string, number> =>
  new Map(
    [...new Set(rows.flatMap((row) => (row.filial ? [row.filial] : [])))]
      .sort((a, b) => a.localeCompare(b))
      .map((name, index) => [name, index + 1]),
  );

const scoreOf = (amount: number, best: number): number | null =>
  best > 0 ? Math.round((amount / best) * 1000) / 10 : null;

const average = (values: readonly (number | null)[]): number | null => {
  const known = values.filter((value): value is number => value !== null);
  return known.length
    ? Math.round((known.reduce((sum, value) => sum + value, 0) / known.length) * 10) / 10
    : null;
};

export const toLeaderboard = (rows: readonly SalesOperator[], team: number | null): Leaderboard => {
  const ids = teamIds(rows);
  const best = Math.max(0, ...rows.map((row) => row.salesAmount));
  const ranked = [...rows].sort(
    (a, b) => b.salesAmount - a.salesAmount || a.fullName.localeCompare(b.fullName),
  );
  return {
    role: "operator",
    columns: OPERATOR_COLUMNS,
    rows: ranked
      .map((row, index) => ({
        id: row.id,
        fullName: row.fullName,
        team: row.filial,
        teamId: row.filial ? (ids.get(row.filial) ?? null) : null,
        filial: row.filial,
        score: scoreOf(row.salesAmount, best),
        rank: index + 1,
        rankDelta: null,
        metrics: metricsOf(row),
        trend: [],
        badges: [],
        statusNow: row.isOnline ? "online" : null,
      }))
      .filter((row) => team === null || row.teamId === team),
  };
};

export const toTeams = (rows: readonly SalesOperator[]): Team[] => {
  const board = toLeaderboard(rows, null);
  return [...teamIds(rows).entries()].map(([name, id]) => {
    const members = board.rows.filter((row) => row.teamId === id);
    const source = rows.filter((row) => row.filial === name);
    // `conversion_pct` — foiz (0–100). Jamoa konversiyasi = konvert bo'lgan lidlar ÷ lidlar
    // (zakazlar soni emas: zakaz lidsiz ham yaratiladi, shuning uchun 100% dan oshib ketardi).
    const leads = source.reduce((sum, row) => sum + row.leads, 0);
    const converted = source.reduce((sum, row) => sum + (row.leads * (row.conversionPct ?? 0)) / 100, 0);
    return {
      id,
      name,
      lead: null,
      members: members.length,
      score: average(members.map((row) => row.score)),
      metrics: { conversionPct: leads > 0 ? Math.round((converted / leads) * 1000) / 10 : null },
    };
  });
};

export const toProfile = (rows: readonly SalesOperator[], id: number): StaffProfile | null => {
  const board = toLeaderboard(rows, null);
  const row = board.rows.find((item) => item.id === id);
  const source = rows.find((item) => item.id === id);
  if (!row || !source) return null;
  const team = board.rows.filter((item) => item.teamId === row.teamId);
  return {
    id: row.id,
    fullName: row.fullName,
    role: "operator",
    team: row.team,
    filial: row.filial,
    hiredAt: null,
    score: row.score,
    rank: row.rank,
    rankOf: board.rows.length,
    columns: OPERATOR_COLUMNS,
    metrics: row.metrics,
    teamAvg: Object.fromEntries(
      Object.keys(row.metrics).map((key) => [key, average(team.map((item) => item.metrics[key] ?? null))]),
    ),
    funnel: [
      { key: "leads", value: source.leads },
      { key: "orders_created", value: source.ordersCreated },
      { key: "orders_delivered", value: source.ordersDelivered },
    ],
    scoreTrend: { labels: [], values: [] },
    ratings:
      source.ratingAvg === null
        ? null
        : { avg: source.ratingAvg, count: source.ratingCount, distribution: {} },
    recentReviews: [],
    aiSummary: null,
    strengths: [],
    weaknesses: [],
  };
};
