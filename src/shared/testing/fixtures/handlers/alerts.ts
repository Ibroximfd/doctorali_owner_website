import type { MockContext } from "../engine";
import { mockError, type MockHandler } from "../types";

type Severity = "critical" | "serious" | "moderate";

type AlertSeed = {
  id: number;
  code: string;
  severity: Severity;
  title: string;
  body: string;
  filial: string | null;
  metricValue: number;
  threshold: number;
  ref: { type: string; id: string } | null;
  minutesAgo: number;
};

const SEEDS: readonly AlertSeed[] = [
  {
    id: 901,
    code: "cod.unsettled",
    severity: "critical",
    title: "Kuryerda naqd 2 kundan beri topshirilmagan",
    body: "Otabek Yusupov · 1 500 000 so'm (4 buyurtma)",
    filial: "Qo'qon",
    metricValue: 1_500_000,
    threshold: 5_000_000,
    ref: { type: "courier", id: "9" },
    minutesAgo: 2880,
  },
  {
    id: 902,
    code: "clinic.closing_mismatch",
    severity: "critical",
    title: "Kassa yopilishida kamomad: −180 000 so'm",
    body: "Kecha · yopdi: S. Jo'rayeva",
    filial: "Qo'qon",
    metricValue: 180_000,
    threshold: 50_000,
    ref: null,
    minutesAgo: 1020,
  },
  {
    id: 903,
    code: "orders.unassigned_courier",
    severity: "serious",
    title: "18 ta tasdiqlangan buyurtma 3 soatdan ortiq kuryersiz",
    body: "Toshkent 11 · Samarqand 7 · jami 10,9 mln so'm",
    filial: null,
    metricValue: 18,
    threshold: 3,
    ref: null,
    minutesAgo: 180,
  },
  {
    id: 904,
    code: "orders.shipping_late",
    severity: "serious",
    title: "21 ta buyurtma 48 soatdan ortiq yo'lda",
    body: "Qo'qon 9 · Samarqand 8 · Toshkent 4",
    filial: null,
    metricValue: 21,
    threshold: 48,
    ref: null,
    minutesAgo: 300,
  },
  {
    id: 905,
    code: "calls.missed_unhandled",
    severity: "serious",
    title: "31 ta o'tkazib yuborilgan qo'ng'iroq hal qilinmagan",
    body: "Eng ko'p: Bekzod Olimov — 9 ta, eng eskisi 4 soat oldin",
    filial: null,
    metricValue: 31,
    threshold: 10,
    ref: null,
    minutesAgo: 240,
  },
  {
    id: 906,
    code: "orders.cancel_rate_high",
    severity: "serious",
    title: "Atkaz ulushi 17,2%",
    body: "O'rtacha 12,6% · asosiy sabab: javob bermadi",
    filial: "Samarqand",
    metricValue: 17.2,
    threshold: 15,
    ref: null,
    minutesAgo: 420,
  },
  {
    id: 907,
    code: "debts.overdue",
    severity: "moderate",
    title: "Muddati o'tgan qarz 8,6 mln so'm",
    body: "14 mijoz · eng kattasi: B. Normatov — 3,2 mln (46 kun)",
    filial: null,
    metricValue: 8_600_000,
    threshold: 10_000_000,
    ref: null,
    minutesAgo: 1440,
  },
  {
    id: 908,
    code: "stock.out",
    severity: "moderate",
    title: "2 mahsulot tugadi, 4 tasi kam qoldi",
    body: "Na'matak siropi (Qo'qon), Qora sedana yog'i (Toshkent)",
    filial: null,
    metricValue: 2,
    threshold: 0,
    ref: null,
    minutesAgo: 360,
  },
  {
    id: 909,
    code: "ratings.low",
    severity: "moderate",
    title: "Past baho: 2 yulduz — Bekzod Olimov",
    body: "«Uzoq kutdim, qayta qo'ng'iroq qilishmadi» · mijoz: A. Sobirov",
    filial: "Toshkent",
    metricValue: 2,
    threshold: 2,
    ref: { type: "operator", id: "14" },
    minutesAgo: 62,
  },
  {
    id: 910,
    code: "sales.filial_lagging",
    severity: "moderate",
    title: "Samarqand jamoasi: bir operatorga sotuv o'rtachadan 17% past",
    body: "122 mln so'm · kompaniya o'rtachasi 147 mln · konversiya 28,7%",
    filial: "Samarqand",
    metricValue: 17.1,
    threshold: 15,
    ref: { type: "filial", id: "3" },
    minutesAgo: 540,
  },
];

/** "Ko'rildi" belgilari — server jarayoni xotirasida (namuna rejimi uchun yetarli). */
const acknowledgedAt = new Map<number, string>();

type RuleUnit = "hours" | "days" | "uzs" | "pct" | "count";
type Rule = {
  code: string;
  enabled: boolean;
  severity: Severity;
  params: { threshold: number };
  unit: RuleUnit;
};

const rules: Rule[] = [
  {
    code: "orders.unassigned_courier",
    enabled: true,
    severity: "serious",
    params: { threshold: 3 },
    unit: "hours",
  },
  {
    code: "orders.pending_stale",
    enabled: true,
    severity: "moderate",
    params: { threshold: 24 },
    unit: "hours",
  },
  {
    code: "orders.shipping_late",
    enabled: true,
    severity: "serious",
    params: { threshold: 48 },
    unit: "hours",
  },
  {
    code: "orders.cancel_rate_high",
    enabled: true,
    severity: "serious",
    params: { threshold: 15 },
    unit: "pct",
  },
  {
    code: "cod.unsettled",
    enabled: true,
    severity: "critical",
    params: { threshold: 5_000_000 },
    unit: "uzs",
  },
  {
    code: "clinic.closing_mismatch",
    enabled: true,
    severity: "critical",
    params: { threshold: 50_000 },
    unit: "uzs",
  },
  {
    code: "debts.overdue",
    enabled: true,
    severity: "moderate",
    params: { threshold: 10_000_000 },
    unit: "uzs",
  },
  {
    code: "calls.missed_unhandled",
    enabled: true,
    severity: "serious",
    params: { threshold: 10 },
    unit: "count",
  },
  {
    code: "activities.overdue",
    enabled: true,
    severity: "moderate",
    params: { threshold: 20 },
    unit: "count",
  },
  {
    code: "sales.filial_lagging",
    enabled: true,
    severity: "moderate",
    params: { threshold: 15 },
    unit: "pct",
  },
  { code: "revenue.drop", enabled: false, severity: "serious", params: { threshold: 30 }, unit: "pct" },
  { code: "plan.behind", enabled: true, severity: "moderate", params: { threshold: 10 }, unit: "pct" },
];

const toAlert = (seed: AlertSeed, now: Date) => {
  const acknowledged = acknowledgedAt.get(seed.id) ?? null;
  return {
    id: seed.id,
    code: seed.code,
    severity: seed.severity,
    status: acknowledged ? "acknowledged" : "open",
    title: seed.title,
    body: seed.body,
    filial: seed.filial,
    metric_value: seed.metricValue,
    threshold: seed.threshold,
    ref: seed.ref,
    opened_at: new Date(now.getTime() - seed.minutesAgo * 60_000).toISOString(),
    acknowledged_at: acknowledged,
    resolved_at: null,
  };
};

const visibleSeeds = (ctx: MockContext): AlertSeed[] =>
  SEEDS.filter(
    (seed) =>
      ctx.isAllFilials || seed.filial === null || ctx.filials.some((filial) => filial.name === seed.filial),
  );

/** Boshqa handlerlar (masalan `overview/`) ham shu ro'yxatdan foydalanadi. */
export const openAlerts = (ctx: MockContext) =>
  visibleSeeds(ctx)
    .filter((seed) => !acknowledgedAt.has(seed.id))
    .map((seed) => toAlert(seed, ctx.now));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const alertsHandlers: MockHandler[] = [
  {
    method: "GET",
    path: "alerts/",
    resolve: (ctx) => {
      const severity = ctx.searchParams.get("severity");
      const status = ctx.searchParams.get("status");
      const all = visibleSeeds(ctx).map((seed) => toAlert(seed, ctx.now));
      const open = all.filter((alert) => alert.status === "open");
      return {
        counts: {
          open: open.length,
          critical: open.filter((alert) => alert.severity === "critical").length,
          serious: open.filter((alert) => alert.severity === "serious").length,
          moderate: open.filter((alert) => alert.severity === "moderate").length,
        },
        results: all.filter(
          (alert) => (!severity || alert.severity === severity) && (!status || alert.status === status),
        ),
      };
    },
  },
  {
    method: "POST",
    path: "alerts/:id/ack/",
    resolve: (ctx) => {
      const seed = SEEDS.find((item) => item.id === Number(ctx.params.id));
      if (!seed) return mockError(404, "alert_not_found");
      acknowledgedAt.set(seed.id, ctx.now.toISOString());
      return toAlert(seed, ctx.now);
    },
  },
  { method: "GET", path: "alerts/rules/", resolve: () => ({ results: rules }) },
  {
    method: "PATCH",
    path: "alerts/rules/:code/",
    resolve: (ctx) => {
      const rule = rules.find((item) => item.code === ctx.params.code);
      if (!rule) return mockError(404, "rule_not_found");
      if (!isRecord(ctx.body)) return mockError(400, "validation_error");

      if (typeof ctx.body.enabled === "boolean") rule.enabled = ctx.body.enabled;
      const params = ctx.body.params;
      if (isRecord(params) && typeof params.threshold === "number" && params.threshold >= 0)
        rule.params = { threshold: params.threshold };
      return rule;
    },
  },
];
