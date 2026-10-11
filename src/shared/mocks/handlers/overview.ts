import { envelope, sparkline, type MockContext } from "../engine";
import { sample } from "../sample";
import type { MockHandler } from "../types";
import { openAlerts } from "./alerts";

const MLN = 1_000_000;

/** Filial bo'yicha asos (30 kun). Yig'indisi `sample.revenue` jamiga teng. */
const FILIAL_ROWS = [
  {
    id: 1,
    name: "Toshkent",
    revenue: 1306 * MLN,
    delta: 11.8,
    orders: 2162,
    deliveryRate: 87.1,
    clinic: 312 * MLN,
    debt: 18.6 * MLN,
    cod: 5.2 * MLN,
  },
  {
    id: 2,
    name: "Qo'qon",
    revenue: 606 * MLN,
    delta: 12.4,
    orders: 1004,
    deliveryRate: 84.9,
    clinic: 174 * MLN,
    debt: 12.6 * MLN,
    cod: 2.6 * MLN,
  },
  {
    id: 3,
    name: "Samarqand",
    revenue: 420 * MLN,
    delta: 4.6,
    orders: 694,
    deliveryRate: 82.8,
    clinic: null,
    debt: null,
    cod: 1.6 * MLN,
  },
] as const;

/**
 * Tanlangan filiallar bo'yicha kanallar (30 kunlik asos). Onlayn konsultatsiya
 * filialga bog'lanmagan — faqat "barcha filiallar" da alohida ko'rinadi.
 */
export const channelBase = (ctx: MockContext): { delivery: number; clinic: number; consultation: number } => {
  if (ctx.isAllFilials) return sample.revenue;
  const rows = FILIAL_ROWS.filter((row) => ctx.filials.some((filial) => filial.id === row.id));
  const clinic = rows.reduce((sum, row) => sum + (row.clinic ?? 0), 0);
  const total = rows.reduce((sum, row) => sum + row.revenue, 0);
  return { delivery: total - clinic, clinic, consultation: 0 };
};

const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

const overview = (ctx: MockContext) => {
  const scale = ctx.period.scale;
  const base = channelBase(ctx);
  const channels = {
    delivery: Math.round(base.delivery * scale),
    clinic: Math.round(base.clinic * scale),
    consultation: Math.round(base.consultation * scale),
  };
  const total = channels.delivery + channels.clinic + channels.consultation;
  const { kpi, plan, quick, cash } = sample;
  const alerts = openAlerts(ctx);
  const isShortPeriod = ctx.period.granularity === "hour";

  return envelope(ctx, {
    revenue: {
      total: ctx.metric(total, 10.6, "uzs"),
      delivery: ctx.metric(channels.delivery, 11.2, "uzs"),
      clinic: ctx.metric(channels.clinic, 7.8, "uzs"),
      consultation: ctx.metric(channels.consultation, 4.9, "uzs"),
    },
    revenue_quick: {
      today: ctx.stock(quick.today),
      today_same_time_yesterday: ctx.stock(quick.todaySameTimeYesterday),
      yesterday: ctx.stock(quick.yesterday),
      week: ctx.stock(quick.week),
      month: ctx.stock(plan.actual),
    },
    plan: {
      month: plan.month,
      target: ctx.stock(plan.target),
      actual: ctx.stock(plan.actual),
      pct: pct(plan.actual, plan.target),
      expected_pct: plan.expectedPct,
      previous: {
        month: plan.previous.month,
        target: ctx.stock(plan.previous.target),
        actual: ctx.stock(plan.previous.actual),
        pct: pct(plan.previous.actual, plan.previous.target),
      },
    },
    kpis: {
      orders: ctx.metric(ctx.flow(kpi.orders), 8.4, "count"),
      delivered: ctx.metric(ctx.flow(kpi.delivered), 9.1, "count"),
      delivery_rate: ctx.metric(pct(kpi.delivered, kpi.delivered + kpi.cancelled), 1.2, "pct"),
      avg_check: ctx.metric(kpi.avgCheck, 2.3, "uzs"),
      clinic_visits: ctx.metric(ctx.flow(kpi.clinicVisits), 5.1, "count"),
      new_customers: ctx.metric(ctx.flow(kpi.newCustomers), -3.4, "count"),
      app_active_users: ctx.metric(isShortPeriod ? kpi.appDau : kpi.appActive, 6.7, "count"),
    },
    sparklines: {
      orders: sparkline(1),
      delivery_rate: sparkline(2, 0.1),
      avg_check: sparkline(3, 0.15),
      clinic_visits: sparkline(4),
      new_customers: sparkline(5, -0.2),
      app_active_users: sparkline(6, 0.3),
    },
    pipeline_now: sample.pipelineNow.map((stage) => ({
      status: stage.status,
      count: ctx.stock(stage.count),
      amount: ctx.stock(stage.amount),
      stale_count: ctx.stock(stage.staleCount),
    })),
    cash_position: {
      clinic_tills: ctx.stock(cash.tills.cash + cash.tills.card + cash.tills.terminal),
      courier_cod: ctx.stock(cash.courierCod),
      online_received: ctx.stock(cash.online.click + cash.online.payme),
      open_debt: ctx.stock(cash.openDebt),
      overdue_debt: ctx.stock(cash.overdueDebt),
    },
    alerts: {
      open_total: alerts.length,
      critical: alerts.filter((alert) => alert.severity === "critical").length,
      serious: alerts.filter((alert) => alert.severity === "serious").length,
      top: alerts.slice(0, 4),
    },
    filials: FILIAL_ROWS.map((row) => ({
      id: row.id,
      name: row.name,
      revenue: ctx.metric(Math.round(row.revenue * scale), row.delta, "uzs"),
      orders: Math.round(row.orders * scale),
      delivery_rate: row.deliveryRate,
      clinic_revenue: row.clinic === null ? null : Math.round(row.clinic * scale),
      open_debt: row.debt,
      courier_cod: row.cod,
    })),
  });
};

const timeseries = (ctx: MockContext) => {
  const base = channelBase(ctx);
  const scale = ctx.period.scale;
  const series = [
    { key: "delivery", values: ctx.series(base.delivery * scale, 11) },
    { key: "clinic", values: ctx.series(base.clinic * scale, 12) },
    { key: "consultation", values: ctx.series(base.consultation * scale, 13) },
  ].filter((item) => item.values.some((value) => value > 0));

  return envelope(ctx, { labels: ctx.period.labels, series, compare: null });
};

const FEED_TEMPLATES = [
  {
    kind: "order.confirmed",
    title: "DA-{n} mijoz ilovada tasdiqladi · naqd",
    filial: "Samarqand",
    amount: 600_000,
    actor: "ilova",
  },
  {
    kind: "order.created",
    title: "DA-{n} yaratildi · Payme to'lovi kutilmoqda",
    filial: "Toshkent",
    amount: 1_240_000,
    actor: "ilova",
  },
  {
    kind: "order.delivered",
    title: "DA-{n} yetkazildi · kuryer Jasur K.",
    filial: "Toshkent",
    amount: 760_000,
    actor: "Jasur Karimov",
  },
  {
    kind: "clinic.payment",
    title: "Klinika · muolaja to'lovi · terminal",
    filial: "Qo'qon",
    amount: 350_000,
    actor: "registratura",
  },
  {
    kind: "order.shipping",
    title: "DA-{n} yo'lga chiqdi · kuryer Bobur R.",
    filial: "Qo'qon",
    amount: 760_000,
    actor: "logist",
  },
  {
    kind: "consultation.paid",
    title: "Konsultatsiya to'landi · dr. Nodira Sultonova",
    filial: null,
    amount: 62_500,
    actor: "ilova",
  },
  {
    kind: "order.delivered",
    title: "DA-{n} yetkazildi · Click",
    filial: "Qo'qon",
    amount: 480_000,
    actor: "Islom Qodirov",
  },
  {
    kind: "order.cancelled",
    title: "DA-{n} atkaz · mijoz rad etdi",
    filial: "Toshkent",
    amount: 920_000,
    actor: "Bekzod Olimov",
  },
  {
    kind: "cod.settled",
    title: "Kuryer naqd topshirdi · Sardor T.",
    filial: "Toshkent",
    amount: 1_900_000,
    actor: "logist",
  },
] as const;

const FEED_STEP_MS = 4 * 60_000;

/** Lenta vaqtga bog'langan: har 4 daqiqada yangi hodisa "tushadi", eskisi pastga siljiydi. */
const feed = (ctx: MockContext) => {
  const limit = Math.min(30, Math.max(1, Number(ctx.searchParams.get("limit")) || 8));
  const latestSlot = Math.floor(ctx.now.getTime() / FEED_STEP_MS);

  return {
    results: Array.from({ length: limit }, (_, index) => {
      const slot = latestSlot - index;
      const template = FEED_TEMPLATES[slot % FEED_TEMPLATES.length] ?? FEED_TEMPLATES[0];
      return {
        id: slot,
        at: new Date(slot * FEED_STEP_MS).toISOString(),
        kind: template.kind,
        filial: template.filial,
        title: template.title.replace("{n}", String(184_000 + (slot % 900))),
        amount: template.amount,
        actor: template.actor,
        ref: null,
      };
    }),
  };
};

export const overviewHandlers: MockHandler[] = [
  { method: "GET", path: "overview/", resolve: overview },
  { method: "GET", path: "overview/timeseries/", resolve: timeseries },
  { method: "GET", path: "feed/", resolve: feed },
];
