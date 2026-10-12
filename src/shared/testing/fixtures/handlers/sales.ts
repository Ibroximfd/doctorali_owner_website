import { MOCK_FILIALS, apportion, envelope, sparkline, type MetricDto, type MockContext } from "../engine";
import { sample } from "../sample";
import { mockError, type MockHandler } from "../types";

type OperatorSeed = (typeof sample.operators)[number];

const MINUTE_MS = 60_000;
/** `ctx.series` dan faqat shakl (vazn) olish uchun yetarlicha katta jami. */
const SHAPE_TOTAL = 1_000_000;

const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

const sumOf = <Item>(items: readonly Item[], pick: (item: Item) => number): number =>
  items.reduce((sum, item) => sum + pick(item), 0);

/** "Hozir" ko'rsatkichi: davrga bog'liq emas, shuning uchun taqqoslash yo'q. */
const nowMetric = (value: number): MetricDto => ({ value, previous: null, delta_pct: null, unit: "count" });

/* ---------- operatorlar ---------- */

const operatorsIn = (ctx: MockContext): OperatorSeed[] =>
  sample.operators.filter((operator) => ctx.filials.some((filial) => filial.name === operator.filial));

/** Operator bitta filialga tegishli — oqim raqamlari faqat davr bo'yicha masshtablanadi. */
const operatorRow = (ctx: MockContext, operator: OperatorSeed) => {
  const inPeriod = (base30d: number): number => Math.round(base30d * ctx.period.scale);

  return {
    id: operator.id,
    full_name: operator.name,
    filial: operator.filial,
    is_online: operator.isOnline,
    leads: inPeriod(operator.leads),
    conversion_pct: operator.conversion,
    orders_created: inPeriod(operator.ordersCreated),
    orders_delivered: inPeriod(operator.ordersDelivered),
    sales_amount: inPeriod(operator.sales),
    commission_earned: inPeriod(operator.commission),
    commission_pending: Math.round(operator.commissionPending),
    calls: inPeriod(operator.calls),
    missed_unhandled: operator.missedUnhandled,
    activities_overdue: operator.activitiesOverdue,
    rating_avg: operator.rating,
    rating_count: operator.ratingCount,
  };
};

const operatorRows = (ctx: MockContext) => operatorsIn(ctx).map((operator) => operatorRow(ctx, operator));

const operatorDetail = (ctx: MockContext) => {
  const operator = sample.operators.find((item) => String(item.id) === ctx.params.id);
  if (!operator) return mockError(404, "operator_not_found");

  const row = operatorRow(ctx, operator);
  return envelope(ctx, {
    ...row,
    trend: {
      labels: ctx.period.labels,
      series: [
        {
          key: "orders_delivered",
          values: apportion(row.orders_delivered, ctx.series(SHAPE_TOTAL, 40 + operator.id, 0.1)),
        },
      ],
      compare: null,
    },
  });
};

/* ---------- filiallar (operator jamoalari) ---------- */

const MLN = 1_000_000;

/** Filial admini (operatorlar rahbari), joriy oy rejasi va sotuvning oldingi davrga nisbatan o'zgarishi. */
const FILIAL_TEAM: Record<number, { admin: string; planTarget: number; salesDelta: number }> = {
  1: { admin: "Rustam Abdullayev", planTarget: 1100 * MLN, salesDelta: 11.8 },
  2: { admin: "Dilshod Mahmudov", planTarget: 480 * MLN, salesDelta: 12.4 },
  3: { admin: "Aziza Normurodova", planTarget: 420 * MLN, salesDelta: 4.6 },
};

/** Operator jamoasining rejasi — `delivery` kanali: oy boshidan tushumning yetkazib berishga to'g'ri keladigan qismi. */
const DELIVERY_REVENUE_SHARE =
  sample.revenue.delivery / (sample.revenue.delivery + sample.revenue.clinic + sample.revenue.consultation);

/** Vaznli o'rtacha (konversiya — lidlar bo'yicha, baho — baholar soni bo'yicha), bir kasrgacha. */
const weightedAverage = <Item>(
  items: readonly Item[],
  value: (item: Item) => number,
  weight: (item: Item) => number,
): number => {
  const weights = sumOf(items, weight);
  return weights > 0
    ? Math.round((sumOf(items, (item) => value(item) * weight(item)) / weights) * 10) / 10
    : 0;
};

/**
 * Har filial — o'z operatorlari yig'indisi, shuning uchun bu jadval operatorlar
 * reytingi va yig'ma KPI bilan aynan mos. Filial filtri ataylab qo'llanmaydi.
 */
const filialTeams = (ctx: MockContext) =>
  MOCK_FILIALS.map((filial) => {
    const team = sample.operators.filter((operator) => operator.filial === filial.name);
    const rows = team.map((operator) => operatorRow(ctx, operator));
    const meta = FILIAL_TEAM[filial.id];
    const sales = sumOf(rows, (row) => row.sales_amount);
    const planActual = Math.round(sample.plan.actual * DELIVERY_REVENUE_SHARE * filial.share);

    return {
      id: filial.id,
      name: filial.name,
      admin_name: meta?.admin ?? null,
      operators_total: team.length,
      operators_online: team.filter((operator) => operator.isOnline).length,
      leads: sumOf(rows, (row) => row.leads),
      conversion_pct: weightedAverage(
        team,
        (operator) => operator.conversion,
        (operator) => operator.leads,
      ),
      orders_delivered: sumOf(rows, (row) => row.orders_delivered),
      sales_amount: ctx.metric(sales, meta?.salesDelta ?? 0, "uzs"),
      sales_per_operator: team.length > 0 ? Math.round(sales / team.length) : 0,
      commission_earned: sumOf(rows, (row) => row.commission_earned),
      calls: sumOf(rows, (row) => row.calls),
      missed_unhandled: sumOf(rows, (row) => row.missed_unhandled),
      activities_overdue: sumOf(rows, (row) => row.activities_overdue),
      rating_avg:
        team.length > 0
          ? weightedAverage(
              team,
              (operator) => operator.rating,
              (operator) => operator.ratingCount,
            )
          : null,
      rating_count: sumOf(team, (operator) => operator.ratingCount),
      plan: meta
        ? { target: meta.planTarget, actual: planActual, pct: pct(planActual, meta.planTarget) }
        : null,
    };
  });

/** Har filialning chizig'i o'z jami sotuviga aynan teng yig'iladi. */
const filialsTrend = (ctx: MockContext) =>
  envelope(ctx, {
    labels: ctx.period.labels,
    series: filialTeams(ctx).map((team) => ({
      key: String(team.id),
      values: apportion(
        team.sales_amount.value,
        ctx.series(SHAPE_TOTAL, 120 + team.id, 0.12 + team.id * 0.04),
      ),
    })),
    compare: null,
  });

/* ---------- lidlar ---------- */

const leadFunnel = (ctx: MockContext) => {
  const rows = sample.leadFunnel.map((status) => ({ ...status, count: ctx.flow(status.count) }));
  const total = sumOf(rows, (row) => row.count);

  return rows.map((row) => ({
    status_id: row.statusId,
    name: row.name,
    kind: row.kind,
    count: row.count,
    share_pct: pct(row.count, total),
  }));
};

/** Manbalar bo'yicha lidlar voronkadagi jami bilan bir xil yig'indi beradi. */
const leadSources = (ctx: MockContext) => {
  const total = sumOf(leadFunnel(ctx), (row) => row.count);
  const leads = apportion(
    total,
    sample.leadSources.map((source) => source.leads),
  );

  return sample.leadSources.map((source, index) => {
    const count = leads[index] ?? 0;
    return {
      source: source.source,
      leads: count,
      converted: Math.round((count * source.conversion) / 100),
      conversion_pct: source.conversion,
      sales_amount: ctx.flow(source.sales),
    };
  });
};

/* ---------- qo'ng'iroqlar ---------- */

/** Jami — operatorlar qo'ng'iroqlari yig'indisi; javob berilgan/o'tkazib yuborilgan nisbati namunadan. */
const callSeries = (ctx: MockContext) => {
  const total = sumOf(operatorRows(ctx), (row) => row.calls);
  const answered = Math.round(total * (sample.calls.answered / sample.calls.total));

  return {
    answered: apportion(answered, ctx.series(SHAPE_TOTAL, 111, 0.08)),
    missed: apportion(total - answered, ctx.series(SHAPE_TOTAL, 112, 0.02)),
  };
};

const calls = (ctx: MockContext) => {
  const series = callSeries(ctx);

  return envelope(ctx, {
    labels: ctx.period.labels,
    series: [
      { key: "answered", values: series.answered },
      { key: "missed", values: series.missed },
    ],
    compare: null,
    avg_duration_sec: sample.calls.avgDurationSec,
  });
};

/* ---------- baholar ---------- */

const ratings = (ctx: MockContext) => {
  const distribution = Object.fromEntries(
    Object.entries(sample.ratings.distribution).map(([stars, count]) => [stars, ctx.flow(count)]),
  );
  const count = sumOf(Object.values(distribution), (value) => value);
  const operatorNames = new Set(operatorsIn(ctx).map((operator) => operator.name));

  return envelope(ctx, {
    avg: count > 0 ? sample.ratings.avg : null,
    count,
    distribution,
    low: sample.ratings.low
      .filter((rating) => operatorNames.has(rating.operator))
      .map((rating) => ({
        stars: rating.stars,
        comment: rating.comment,
        operator: rating.operator,
        client: rating.client,
        at: new Date(ctx.now.getTime() - rating.minutesAgo * MINUTE_MS).toISOString(),
      })),
  });
};

/* ---------- yig'ma ---------- */

const summary = (ctx: MockContext) => {
  const operators = operatorRows(ctx);
  const funnel = leadFunnel(ctx);
  const leads = sumOf(funnel, (row) => row.count);
  const converted = sumOf(
    funnel.filter((row) => row.kind === "success"),
    (row) => row.count,
  );

  return envelope(ctx, {
    leads: ctx.metric(leads, 12.4, "count"),
    conversion: ctx.metric(pct(converted, leads), 1.6, "pct"),
    sales_amount: ctx.metric(
      sumOf(operators, (row) => row.sales_amount),
      9.8,
      "uzs",
    ),
    calls_total: ctx.metric(
      sumOf(operators, (row) => row.calls),
      4.4,
      "count",
    ),
    calls_missed_unhandled: nowMetric(sumOf(operators, (row) => row.missed_unhandled)),
    activities_overdue: nowMetric(sumOf(operators, (row) => row.activities_overdue)),
    avg_rating: ctx.metric(sample.ratings.avg, 0.4),
    sparklines: {
      leads: sparkline(101),
      conversion: sparkline(102, 0.1),
      sales_amount: sparkline(103),
      calls_total: sparkline(104, 0.1),
    },
  });
};

/** `sales` bo'limi namunalari (`02_BACKEND_TZ` §4.7). */
export const salesHandlers: MockHandler[] = [
  { method: "GET", path: "sales/summary/", resolve: summary },
  { method: "GET", path: "sales/operators/", resolve: (ctx) => envelope(ctx, operatorRows(ctx)) },
  { method: "GET", path: "sales/operators/:id/", resolve: operatorDetail },
  { method: "GET", path: "sales/filials/", resolve: (ctx) => envelope(ctx, filialTeams(ctx)) },
  { method: "GET", path: "sales/filials/timeseries/", resolve: filialsTrend },
  { method: "GET", path: "sales/leads-funnel/", resolve: (ctx) => envelope(ctx, leadFunnel(ctx)) },
  { method: "GET", path: "sales/lead-sources/", resolve: (ctx) => envelope(ctx, leadSources(ctx)) },
  { method: "GET", path: "sales/calls/", resolve: calls },
  { method: "GET", path: "sales/ratings/", resolve: ratings },
];
