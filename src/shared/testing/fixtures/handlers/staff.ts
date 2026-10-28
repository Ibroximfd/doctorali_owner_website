import { envelope, type MockContext } from "../engine";
import { mockError, type MockHandler } from "../types";

const COLUMNS: Record<string, { key: string; unit: string; better: "higher" | "lower" }[]> = {
  operator: [
    { key: "leads", unit: "count", better: "higher" },
    { key: "orders", unit: "count", better: "higher" },
    { key: "conversion_pct", unit: "pct", better: "higher" },
    { key: "cancel_rate_pct", unit: "pct", better: "lower" },
    { key: "revenue", unit: "uzs", better: "higher" },
    { key: "rating", unit: "rating", better: "higher" },
  ],
  courier: [
    { key: "delivered", unit: "count", better: "higher" },
    { key: "success_rate_pct", unit: "pct", better: "higher" },
    { key: "on_time_pct", unit: "pct", better: "higher" },
    { key: "rating", unit: "rating", better: "higher" },
    { key: "cash_discipline_pct", unit: "pct", better: "higher" },
  ],
};

const PEOPLE = {
  operator: [
    ["Dilnoza Karimova", 2, 412, 158, 9.1, 4.8, 86.4, 2, ["top_conversion"]],
    ["Javohir Ergashev", 3, 380, 121, 12.4, 4.6, 74.2, -1, []],
    ["Madina Ismoilova", 2, 350, 98, 14.8, 4.5, 63.0, 0, []],
    ["Shahzod Rahimov", 3, 290, 51, 24.0, 4.1, 38.5, -3, ["needs_attention"]],
    ["Yangi operator", 2, 6, 1, 0, 0, null, null, []],
  ],
  courier: [
    ["Jasur Karimov", 2, 448, 412, 91.2, 4.9, 88.0, 1, ["best_rated"]],
    ["Bekzod Toshmatov", 3, 390, 330, 84.6, 4.6, 71.5, 0, []],
    ["Aziz Rahimov", 3, 310, 230, 74.2, 4.2, 52.1, -2, ["needs_attention"]],
  ],
} as const;

const TEAMS = [
  { id: 2, name: "Toshkent call-center", lead: "Malika Yusupova (admin)" },
  { id: 3, name: "Qo'qon call-center", lead: "Sardor Aliyev (admin)" },
] as const;

const roleOf = (ctx: MockContext): "operator" | "courier" =>
  ctx.searchParams.get("role") === "courier" ? "courier" : "operator";

const rowsFor = (ctx: MockContext, role: "operator" | "courier") =>
  PEOPLE[role].map(([name, teamId, a, b, c, rating, score, delta, badges], index) => {
    const team = TEAMS.find((item) => item.id === teamId) ?? null;
    const metrics: Record<string, number | null> =
      role === "operator"
        ? {
            leads: ctx.flow(a),
            orders: ctx.flow(b),
            conversion_pct: a > 0 ? Math.round((b / a) * 1000) / 10 : null,
            cancel_rate_pct: c,
            revenue: ctx.flow(b) * 690_000,
            rating,
          }
        : {
            delivered: ctx.flow(b),
            success_rate_pct: c,
            on_time_pct: c - 4,
            rating,
            cash_discipline_pct: 100 - index * 12,
          };
    return {
      id: (role === "operator" ? 10 : 100) + index,
      full_name: name,
      team: team?.name ?? null,
      team_id: team?.id ?? null,
      filial: team?.id === 3 ? "Qo'qon" : "Toshkent",
      score,
      rank: index + 1,
      rank_delta: delta,
      metrics,
      trend: score === null ? [] : [score - 9, score - 5, score - 2, score],
      badges: [...badges],
      status_now: index % 2 ? "online" : "on_call",
    };
  });

const leaderboard = (ctx: MockContext) => {
  const role = roleOf(ctx);
  const team = Number(ctx.searchParams.get("team"));
  return envelope(ctx, {
    role,
    columns: COLUMNS[role],
    rows: rowsFor(ctx, role).filter((row) => !team || row.team_id === team),
  });
};

const teams = (ctx: MockContext) => {
  const rows = rowsFor(ctx, roleOf(ctx));
  return envelope(
    ctx,
    TEAMS.map((team) => {
      const members = rows.filter((row) => row.team_id === team.id);
      const scored = members.filter((row) => row.score !== null);
      return {
        id: team.id,
        name: team.name,
        lead: team.lead,
        members: members.length,
        score: scored.length
          ? Math.round((scored.reduce((sum, row) => sum + (row.score ?? 0), 0) / scored.length) * 10) / 10
          : null,
        metrics: {
          conversion_pct: 31 + team.id,
          cancel_rate_pct: 10 + team.id,
          revenue: 600_000_000 / team.id,
        },
      };
    }),
  );
};

const profile = (ctx: MockContext) => {
  const id = Number(ctx.params.id);
  const role = id >= 100 ? "courier" : "operator";
  const row = rowsFor(ctx, role).find((item) => item.id === id);
  if (!row) return mockError(404, "staff_not_found");
  const { metrics } = row;
  return envelope(ctx, {
    id: row.id,
    full_name: row.full_name,
    role,
    team: row.team,
    filial: row.filial,
    hired_at: "2025-03-01",
    score: row.score,
    rank: row.rank,
    rank_of: PEOPLE[role].length,
    columns: COLUMNS[role],
    metrics,
    team_avg: Object.fromEntries(
      Object.entries(metrics).map(([key, value]) => [
        key,
        value === null ? null : Math.round(value * 0.9 * 10) / 10,
      ]),
    ),
    funnel:
      role === "operator"
        ? [
            { key: "leads", value: Number(metrics.leads) },
            { key: "contacted", value: Math.round(Number(metrics.leads) * 0.9) },
            { key: "orders", value: Number(metrics.orders) },
            { key: "delivered", value: Math.round(Number(metrics.orders) * 0.88) },
          ]
        : [
            { key: "assigned", value: 448 },
            { key: "delivered", value: Number(metrics.delivered) },
          ],
    score_trend: { labels: ["2026-10-06", "2026-10-13", "2026-10-20", "2026-10-27"], values: row.trend },
    ratings: {
      avg: Number(metrics.rating),
      count: 96,
      distribution: { "5": 80, "4": 12, "3": 3, "2": 1, "1": 0 },
    },
    recent_reviews: [{ at: ctx.now.toISOString(), stars: 5, text: "Juda xushmuomala" }],
    ai_summary: "Konversiyasi jamoadan 7 p.p. yuqori; kechqurun javob vaqti uzaymoqda.",
    strengths: ["Tez javob"],
    weaknesses: ["Kechki smenada sust"],
  });
};

export const staffHandlers: MockHandler[] = [
  { method: "GET", path: "staff/leaderboard/", resolve: leaderboard },
  { method: "GET", path: "staff/teams/", resolve: teams },
  { method: "GET", path: "staff/:id/", resolve: profile },
];
