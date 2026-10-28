import { apportion, envelope, sparkline, type MockContext } from "../engine";
import { sample } from "../sample";
import { mockError, type MockHandler } from "../types";

type Courier = (typeof sample.couriers)[number];

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Eng eski topshirilmagan naqd kun boshida emas, bir necha soat oldin olingan deb hisoblanadi. */
const UNSETTLED_OFFSET_MS = 3 * HOUR_MS;

const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

const sumOf = <Item>(items: readonly Item[], pick: (item: Item) => number): number =>
  items.reduce((sum, item) => sum + pick(item), 0);

const isInScope = (ctx: MockContext, filialName: string): boolean =>
  ctx.filials.some((filial) => filial.name === filialName);

/** Kuryer bitta filialga tegishli — oqim ko'rsatkichlari faqat davr bo'yicha masshtablanadi. */
const courierRow = (ctx: MockContext, courier: Courier) => {
  const scaled = (value: number) => Math.round(value * ctx.period.scale);

  return {
    id: courier.id,
    full_name: courier.name,
    filial: courier.filial,
    is_active: true,
    assigned: scaled(courier.assigned),
    delivered: scaled(courier.delivered),
    cancelled: scaled(courier.cancelled),
    success_rate: pct(courier.delivered, courier.assigned),
    avg_minutes: courier.avgMinutes,
    attempts: scaled(courier.attempts),
    cod_collected: scaled(courier.codCollected),
    cod_unsettled: Math.round(courier.codUnsettled),
    oldest_unsettled_at:
      courier.codUnsettled > 0
        ? new Date(ctx.now.getTime() - courier.unsettledDays * DAY_MS - UNSETTLED_OFFSET_MS).toISOString()
        : null,
  };
};

/** Jami — kuryer qatorlarining yig'indisi: xulosa va jadval hech qachon farq qilmaydi. */
const scopeTotals = (ctx: MockContext) => {
  const scoped = sample.couriers.filter((courier) => isInScope(ctx, courier.filial));
  const rows = scoped.map((courier) => courierRow(ctx, courier));

  return {
    rows,
    delivered: sumOf(rows, (row) => row.delivered),
    cancelled: sumOf(rows, (row) => row.cancelled),
    attempts: sumOf(rows, (row) => row.attempts),
    codUnsettled: sumOf(rows, (row) => row.cod_unsettled),
    // Ulush davrga bog'liq emas — yaxlitlanmagan asosdan olinadi.
    successRate: pct(
      sumOf(scoped, (courier) => courier.delivered),
      sumOf(scoped, (courier) => courier.assigned),
    ),
  };
};

const summary = (ctx: MockContext) => {
  const totals = scopeTotals(ctx);
  const { logistics } = sample;

  return envelope(ctx, {
    in_transit_now: ctx.stock(logistics.inTransitNow),
    late_now: ctx.stock(logistics.lateNow),
    unassigned_now: ctx.stock(logistics.unassignedNow),
    delivered: ctx.metric(totals.delivered, 9.1, "count"),
    success_rate: ctx.metric(totals.successRate, 0.7, "pct"),
    avg_delivery_minutes: ctx.metric(logistics.avgDeliveryMinutes, -5.1, "min"),
    attempts: ctx.metric(totals.attempts, 4.2, "count"),
    cod_unsettled: totals.codUnsettled,
    cod_unsettled_couriers: totals.rows.filter((row) => row.cod_unsettled > 0).length,
    sparklines: {
      delivered: sparkline(81),
      success_rate: sparkline(82, 0.1),
      avg_delivery_minutes: sparkline(83, -0.2),
      attempts: sparkline(84, 0.1),
    },
  });
};

const courierList = (ctx: MockContext) => envelope(ctx, scopeTotals(ctx).rows);

const courierDetail = (ctx: MockContext) => {
  const found = sample.couriers.find((item) => item.id === Number(ctx.params.id));
  if (!found) return mockError(404, "courier_not_found");

  const row = courierRow(ctx, found);
  return envelope(ctx, {
    ...row,
    timeseries: {
      labels: ctx.period.labels,
      series: [{ key: "delivered", values: ctx.series(row.delivered, 40 + found.id, 0.1) }],
      compare: null,
    },
  });
};

const timeseries = (ctx: MockContext) => {
  const totals = scopeTotals(ctx);

  return envelope(ctx, {
    labels: ctx.period.labels,
    series: [
      { key: "delivered", values: ctx.series(totals.delivered, 91) },
      { key: "cancelled", values: ctx.series(totals.cancelled, 92, 0.02) },
      { key: "attempts", values: ctx.series(totals.attempts, 93, 0.05) },
    ],
    compare: null,
  });
};

const regions = (ctx: MockContext) =>
  envelope(
    ctx,
    sample.regionTimes.map((region) => ({
      region: region.region,
      orders: ctx.flow(region.orders),
      delivered: ctx.flow(region.delivered),
      avg_minutes: region.avgMinutes,
      success_rate: pct(region.delivered, region.orders),
    })),
  );

const attemptReasons = (ctx: MockContext) => {
  const total = scopeTotals(ctx).attempts;
  const weights = sample.attemptReasons.map((item) => item.count);
  const counts = apportion(total, weights);

  return envelope(
    ctx,
    sample.attemptReasons.map((item, index) => {
      const count = counts[index] ?? 0;
      return { reason: item.reason, count, share_pct: pct(count, total) };
    }),
  );
};

/** Transferlar — oxirgi ko'chirishlar ro'yxati: jo'natuvchi yoki qabul qiluvchi tanlangan filial bo'lsa ko'rinadi. */
const transfers = (ctx: MockContext) => {
  const results = sample.transfers
    .filter((transfer) => isInScope(ctx, transfer.fromFilial) || isInScope(ctx, transfer.toFilial))
    .map((transfer) => ({
      id: transfer.id,
      number: transfer.number,
      from_filial: transfer.fromFilial,
      to_filial: transfer.toFilial,
      status: transfer.status,
      items_count: transfer.itemsCount,
      created_at: new Date(ctx.now.getTime() - transfer.daysAgo * DAY_MS).toISOString(),
    }));

  return envelope(ctx, { count: results.length, results });
};

/** `logistics` bo'limi namunalari (`02_BACKEND_TZ` §4.6 + bitta kuryer kartasi). */
/** Jonli doska: kuryerlar namunadagi bilan bir xil (id, ism), holat va naqd — hozirgi vaqtga bog'liq. */
const LIVE_STATES = [
  ["moving", 34, 62, 4_200_000, 3],
  ["idle", 0, 41, 1_100_000, 5],
  ["no_signal", null, 12, 12_600_000, 30],
  ["off_shift", null, null, 0, 0],
] as const;

const live = (ctx: MockContext) => {
  const scoped = sample.couriers.filter((courier) => isInScope(ctx, courier.filial));
  const couriers = scoped.map((courier, index) => {
    const [status, speed, battery, cash, cashHours] =
      LIVE_STATES[index % LIVE_STATES.length] ?? LIVE_STATES[0];
    const region = MOCK_REGION_OF[courier.filial] ?? "toshkent_shahar";
    return {
      id: courier.id,
      full_name: courier.name,
      filial: courier.filial,
      region,
      source: index === 5 ? "marketplace" : "doctor_ali",
      status,
      speed_kmh: speed,
      last_signal_at:
        status === "off_shift"
          ? null
          : new Date(ctx.now.getTime() - (status === "no_signal" ? 40 : 1) * 60_000).toISOString(),
      shift_started_at:
        status === "off_shift" ? null : new Date(ctx.now.getTime() - 5 * HOUR_MS).toISOString(),
      battery_pct: battery,
      assigned_today: 14 + index,
      delivered_today: 8 + index,
      cancelled_today: index % 3,
      cash_on_hand: cash,
      cash_since: cash > 0 ? new Date(ctx.now.getTime() - cashHours * HOUR_MS).toISOString() : null,
      handover_pending: index === 0 ? 3_500_000 : null,
    };
  });
  const regions = [...new Set(couriers.map((courier) => courier.region))].map((region) => {
    const own = couriers.filter((courier) => courier.region === region);
    return {
      region,
      couriers_total: own.length,
      couriers_working: own.filter((courier) => courier.status === "moving" || courier.status === "idle")
        .length,
      delivered_today: sumOf(own, (courier) => courier.delivered_today),
      pending_today: sumOf(
        own,
        (courier) => courier.assigned_today - courier.delivered_today - courier.cancelled_today,
      ),
      cash_today: sumOf(own, (courier) => courier.cash_on_hand),
    };
  });
  return envelope(ctx, { couriers, regions });
};

const MOCK_REGION_OF: Record<string, string> = {
  Toshkent: "toshkent_shahar",
  "Qo'qon": "fargona",
  Samarqand: "samarqand",
};

const handovers = (ctx: MockContext) =>
  envelope(ctx, {
    pending: [
      {
        id: 77,
        courier_id: 1,
        courier_name: "Jasur Karimov",
        amount: 3_500_000,
        requested_at: new Date(ctx.now.getTime() - 20 * 60_000).toISOString(),
      },
    ],
    recent: [
      {
        id: 75,
        courier_name: "Bekzod Toshmatov",
        amount: 2_100_000,
        status: "accepted",
        decided_at: new Date(ctx.now.getTime() - 2 * HOUR_MS).toISOString(),
        decided_by: "Kassir Dilnoza",
      },
      {
        id: 74,
        courier_name: "Aziz Rahimov",
        amount: 900_000,
        status: "rejected",
        decided_at: new Date(ctx.now.getTime() - 5 * HOUR_MS).toISOString(),
        decided_by: "Kassir Dilnoza",
      },
    ],
  });

export const logisticsHandlers: MockHandler[] = [
  { method: "GET", path: "logistics/live/", resolve: live },
  { method: "GET", path: "logistics/handovers/", resolve: handovers },
  { method: "GET", path: "logistics/summary/", resolve: summary },
  { method: "GET", path: "logistics/couriers/", resolve: courierList },
  { method: "GET", path: "logistics/couriers/:id/", resolve: courierDetail },
  { method: "GET", path: "logistics/timeseries/", resolve: timeseries },
  { method: "GET", path: "logistics/regions/", resolve: regions },
  { method: "GET", path: "logistics/attempt-reasons/", resolve: attemptReasons },
  { method: "GET", path: "logistics/transfers/", resolve: transfers },
];
