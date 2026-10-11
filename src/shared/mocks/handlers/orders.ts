import { addDays, tashkentDate } from "@/shared/lib/scope";

import { MOCK_FILIALS, apportion, envelope, hourShape, rng, sparkline, type MockContext } from "../engine";
import { sample } from "../sample";
import { mockError, type MockHandler } from "../types";

/**
 * `orders` bo'limi namunalari (`02_BACKEND_TZ` §4.3). Barcha sonlar bitta
 * `orderCounts` dan chiqadi, taqsimotlar esa jamiga aynan teng bo'linadi —
 * shuning uchun bloklar bir-biriga mos (hududlar = jami buyurtma, voronka = KPI …).
 */

const MINUTE_MS = 60_000;

const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

/* ---------- davr bo'yicha sonlar ---------- */

type OrderCounts = {
  created: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  inProgress: number;
};

const funnelBase = (status: string): { count: number; amount: number } =>
  sample.funnel.find((stage) => stage.status === status) ?? { count: 0, amount: 0 };

/** Kogorta sonlari. Yaxlitlash bosqichlar tartibini buzmasligi uchun har biri oldingisidan oshmaydi. */
const orderCounts = (ctx: MockContext): OrderCounts => {
  const created = ctx.flow(sample.kpi.orders);
  const confirmed = Math.min(created, ctx.flow(funnelBase("confirmed").count));
  const shipped = Math.min(confirmed, ctx.flow(funnelBase("shipping").count));
  const delivered = Math.min(shipped, ctx.flow(sample.kpi.delivered));
  const cancelled = Math.min(created - delivered, ctx.flow(sample.kpi.cancelled));
  return { created, confirmed, shipped, delivered, cancelled, inProgress: created - delivered - cancelled };
};

const ORDERS_DELTA = 8.4;

const summary = (ctx: MockContext) => {
  const counts = orderCounts(ctx);

  return envelope(ctx, {
    orders: ctx.metric(counts.created, ORDERS_DELTA, "count"),
    confirmed_rate: ctx.metric(pct(counts.confirmed, counts.created), 1.2, "pct"),
    delivered: ctx.metric(counts.delivered, 9.1, "count"),
    delivery_rate: ctx.metric(pct(counts.delivered, counts.delivered + counts.cancelled), 1.2, "pct"),
    cancel_rate: ctx.metric(pct(counts.cancelled, counts.created), -0.8, "pct"),
    avg_check: ctx.metric(sample.kpi.avgCheck, 2.3, "uzs"),
    avg_delivery_minutes: ctx.metric(sample.logistics.avgDeliveryMinutes, -5.1, "min"),
    sparklines: {
      orders: sparkline(21),
      confirmed_rate: sparkline(22, 0.1),
      delivered: sparkline(23),
      cancel_rate: sparkline(24, -0.2),
      avg_check: sparkline(25, 0.15),
      avg_delivery_minutes: sparkline(26, -0.2),
    },
  });
};

const funnel = (ctx: MockContext) => {
  const counts = orderCounts(ctx);
  const stage = (status: string, count: number) => ({
    status,
    count,
    amount: ctx.flow(funnelBase(status).amount),
    pct_of_created: pct(count, counts.created),
  });

  return envelope(ctx, {
    stages: [
      stage("created", counts.created),
      stage("confirmed", counts.confirmed),
      stage("shipping", counts.shipped),
      stage("delivered", counts.delivered),
    ],
    transitions: {
      pending_to_confirmed: pct(counts.confirmed, counts.created),
      confirmed_to_shipping: pct(counts.shipped, counts.confirmed),
      shipping_to_delivered: pct(counts.delivered, counts.shipped),
    },
    cancelled: { count: counts.cancelled, pct_of_created: pct(counts.cancelled, counts.created) },
    in_progress: { count: counts.inProgress, pct_of_created: pct(counts.inProgress, counts.created) },
  });
};

/** `ctx.series` shaklini saqlab, yig'indini aynan `total` ga keltiradi. */
const SERIES_RESOLUTION = 1_000_000;
const exactSeries = (ctx: MockContext, total: number, seed: number, growth?: number): number[] =>
  apportion(total, ctx.series(SERIES_RESOLUTION, seed, growth));

const timeseries = (ctx: MockContext) => {
  const counts = orderCounts(ctx);

  return envelope(ctx, {
    labels: ctx.period.labels,
    series: [
      { key: "created", values: exactSeries(ctx, counts.created, 31) },
      { key: "delivered", values: exactSeries(ctx, counts.delivered, 32) },
      { key: "cancelled", values: exactSeries(ctx, counts.cancelled, 33, 0.02) },
      { key: "delivered_amount", values: ctx.series(ctx.flow(funnelBase("delivered").amount), 34) },
    ],
    compare: null,
  });
};

/* ---------- taqsimotlar ---------- */

const SOURCE_LABELS: Record<string, string> = {
  operator: "Operator (CRM)",
  mehrigiyo: "Mijoz ilovasi",
  doctor: "Shifokor",
  reception: "Registratura",
  sino_ai: "Sino AI",
};

const CANCEL_REASON_LABELS: Record<string, string> = {
  client_refused: "Mijoz rad etdi",
  no_answer: "Javob bermadi",
  client_request: "Mijoz so'radi",
  wrong_address: "Manzil xato",
  duplicate: "Dublikat",
  payment_failed: "To'lov o'tmadi",
  out_of_stock: "Mahsulot yo'q",
  other: "Boshqa",
  staff_issue: "Xodimlar bilan muammo",
  product_issue: "Mahsulot bilan muammo",
};

const CONFIRMATION_LABELS: Record<string, string> = {
  app_slide: "Ilovada surish",
  phone: "Telefon orqali",
  app_checkout: "Ilova checkout",
  payment_webhook: "Onlayn to'lov",
  crm_force: "Logist / admin",
};

type BreakdownBase = { key: string; label: string; count: number };

const labelled =
  (labels: Record<string, string>) =>
  (row: { key: string; count: number }): BreakdownBase => ({ ...row, label: labels[row.key] ?? row.key });

/** Har o'lchov: asos qatorlar va ular qaysi jamiga bo'linishi. */
const BREAKDOWNS: Record<string, { rows: readonly BreakdownBase[]; total: (counts: OrderCounts) => number }> =
  {
    source: { rows: sample.sources.map(labelled(SOURCE_LABELS)), total: (counts) => counts.created },
    region: {
      rows: sample.regions.map((region) => ({ key: region.code, label: region.name, count: region.count })),
      total: (counts) => counts.created,
    },
    cancel_reason: {
      rows: sample.cancelReasons.map(labelled(CANCEL_REASON_LABELS)),
      total: (counts) => counts.cancelled,
    },
    confirmation_channel: {
      rows: sample.confirmChannels.map(labelled(CONFIRMATION_LABELS)),
      total: (counts) => counts.confirmed,
    },
  };

const breakdown = (ctx: MockContext) => {
  const by = ctx.searchParams.get("by") ?? "";
  const dimension = BREAKDOWNS[by];
  if (!dimension) return mockError(400, "invalid_breakdown", `Unsupported by=${by}`);

  const counts = orderCounts(ctx);
  const total = dimension.total(counts);
  const weights = dimension.rows.map((row) => row.count);
  const rowCounts = apportion(total, weights);
  const isCancelReason = by === "cancel_reason";
  const delivered = isCancelReason ? weights.map(() => 0) : apportion(counts.delivered, weights);
  const cancelled = isCancelReason ? rowCounts : apportion(counts.cancelled, weights);

  return envelope(
    ctx,
    dimension.rows.map((row, index) => {
      const count = rowCounts[index] ?? 0;
      const previous = ctx.metric(count, ORDERS_DELTA).previous;
      return {
        key: row.key,
        label: row.label,
        count,
        amount: count * sample.kpi.avgCheck,
        share_pct: pct(count, total),
        delivered: delivered[index] ?? 0,
        cancelled: cancelled[index] ?? 0,
        previous_count: previous === null ? null : Math.round(previous),
      };
    }),
  );
};

const stageDurations = (ctx: MockContext) =>
  envelope(
    ctx,
    sample.stageDurations.map((stage) => ({
      stage: stage.stage,
      p50_min: stage.p50,
      avg_min: stage.avg,
      p90_min: stage.p90,
      target_min: stage.target,
      previous_p50_min: ctx.compare === "none" ? null : stage.previousP50,
    })),
  );

const HOURS_PER_DAY = 24;
const WEEKDAY_FACTOR = [1, 1, 1, 1, 1, 0.85, 0.6] as const;

/** Hafta kuni × soat vaznlari (dushanbadan): kun ichidagi ikki cho'qqi, dam olish kunlari sustroq. */
const HEATMAP_WEIGHTS: readonly number[] = (() => {
  const random = rng(77);
  return WEEKDAY_FACTOR.flatMap((dayFactor) =>
    Array.from({ length: HOURS_PER_DAY }, (_, hour) => hourShape(hour) * dayFactor * (0.85 + random() * 0.3)),
  );
})();

const heatmap = (ctx: MockContext) =>
  envelope(
    ctx,
    apportion(orderCounts(ctx).created, HEATMAP_WEIGHTS).map((count, index) => ({
      weekday: Math.floor(index / HOURS_PER_DAY) + 1,
      hour: index % HOURS_PER_DAY,
      count,
    })),
  );

/* ---------- buyurtmalar (ro'yxat, karta, qotib qolganlar) ---------- */

type OrderSeed = {
  id: string;
  orderNumber: string;
  status: string;
  client: string;
  phone: string;
  region: string;
  amount: number;
  paymentMethod: string | null;
  paymentStatus: string;
  source: string;
  operator: string | null;
  courier: string | null;
  filial: string;
  hasApp: boolean;
  /** Yaratilganidan beri. */
  minutesAgo: number;
  /** Hozirgi holatga o'tganidan beri (berilmasa — yaratilganidan beri o'tgan vaqtning o'ndan biri). */
  statusMinutesAgo?: number;
};

type StuckProfile = Pick<
  OrderSeed,
  "client" | "phone" | "region" | "paymentMethod" | "paymentStatus" | "source" | "operator" | "hasApp"
> & {
  /** Yaratilgandan hozirgi holatga o'tguncha ketgan vaqt. */
  leadHours: number;
};

/** `sample.stuck` da faqat jadval ustunlari bor — karta ochilishi uchun qolgan maydonlar shu yerda. */
const STUCK_PROFILES: Record<string, StuckProfile> = {
  "DA-183712": {
    client: "Sanjar Egamberdiyev",
    phone: "+998916041212",
    region: "fargona",
    paymentMethod: "cash",
    paymentStatus: "cod_pending",
    source: "operator",
    operator: "Shahzod Nematov",
    hasApp: true,
    leadHours: 5,
  },
  "DA-183802": {
    client: "Nilufar Hasanova",
    phone: "+998937775544",
    region: "samarqand",
    paymentMethod: "cash",
    paymentStatus: "cod_pending",
    source: "operator",
    operator: "Jahongir Tursunov",
    hasApp: false,
    leadHours: 4,
  },
  "DA-183688": {
    client: "Akmal Yo'ldoshev",
    phone: "+998901357911",
    region: "toshkent_shahar",
    paymentMethod: null,
    paymentStatus: "not_selected",
    source: "operator",
    operator: "Bekzod Olimov",
    hasApp: true,
    leadHours: 0,
  },
  "DA-183940": {
    client: "Lola Nazarova",
    phone: "+998977412580",
    region: "toshkent",
    paymentMethod: "cash",
    paymentStatus: "cod_pending",
    source: "mehrigiyo",
    operator: null,
    hasApp: true,
    leadHours: 1,
  },
  "DA-183955": {
    client: "Ulug'bek Rahmonov",
    phone: "+998946320011",
    region: "qashqadaryo",
    paymentMethod: "click",
    paymentStatus: "paid",
    source: "mehrigiyo",
    operator: null,
    hasApp: true,
    leadHours: 1,
  },
};

const HOUR_MINUTES = 60;

const STUCK_SEEDS: readonly (OrderSeed & { hours: number; rule: string })[] = sample.stuck.flatMap((row) => {
  const profile = STUCK_PROFILES[row.orderNumber];
  if (!profile) return [];
  const { leadHours, ...rest } = profile;
  return [
    {
      ...rest,
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      amount: row.amount,
      filial: row.filial,
      // `holder` — hozir kimda: yo'lda bo'lsa kuryer, tasdiq kutilayotgan bo'lsa operator.
      courier: row.status === "shipping" ? row.holder : null,
      minutesAgo: (row.hours + leadHours) * HOUR_MINUTES,
      statusMinutesAgo: row.hours * HOUR_MINUTES,
      hours: row.hours,
      rule: row.rule,
    },
  ];
});

const ORDER_SEEDS: readonly OrderSeed[] = [...sample.orders, ...STUCK_SEEDS];

const inFilials =
  (ctx: MockContext) =>
  (seed: OrderSeed): boolean =>
    ctx.filials.some((filial) => filial.name === seed.filial);

const createdAt = (seed: OrderSeed, now: Date): Date => new Date(now.getTime() - seed.minutesAgo * MINUTE_MS);

const regionName = (code: string): string | null =>
  sample.regions.find((region) => region.code === code)?.name ?? null;

const stuck = (ctx: MockContext) => {
  const results = STUCK_SEEDS.filter(inFilials(ctx)).map((seed) => ({
    id: seed.id,
    order_number: seed.orderNumber,
    status: seed.status,
    since: new Date(ctx.now.getTime() - seed.hours * HOUR_MINUTES * MINUTE_MS).toISOString(),
    hours_in_status: seed.hours,
    amount: seed.amount,
    filial: seed.filial,
    operator: seed.operator,
    courier: seed.courier,
    lead_name: seed.client,
    rule: seed.rule,
  }));
  // Umumiy son — "Umumiy" sahifasidagi bosqichlar bo'yicha kechikkanlar yig'indisi bilan bir xil.
  const staleTotal = sample.pipelineNow.reduce((sum, stage) => sum + ctx.stock(stage.staleCount), 0);

  return envelope(ctx, { count: Math.max(results.length, staleTotal), results });
};

const toRow = (seed: OrderSeed, now: Date) => ({
  id: seed.id,
  order_number: seed.orderNumber,
  status: seed.status,
  payment: { method: seed.paymentMethod, status: seed.paymentStatus },
  client: { full_name: seed.client, phones: [seed.phone], has_app: seed.hasApp },
  source: seed.source,
  delivery: { region: seed.region, region_display: regionName(seed.region) },
  payable_amount: seed.amount,
  created_at: createdAt(seed, now).toISOString(),
});

const PHONE_LIKE = /^[\d\s+()-]+$/;
const digitsOf = (value: string): string => value.replace(/\D/g, "");

/** Qidiruv: buyurtma raqami, mijoz ismi yoki telefon (raqamlar bo'yicha). */
const matchesSearch = (seed: OrderSeed, needle: string): boolean => {
  if (needle === "") return true;
  if (seed.orderNumber.toLowerCase().includes(needle) || seed.client.toLowerCase().includes(needle))
    return true;
  return (
    PHONE_LIKE.test(needle) && digitsOf(needle) !== "" && digitsOf(seed.phone).includes(digitsOf(needle))
  );
};

const positiveInt = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const MAX_PAGE_SIZE = 100;

const list = (ctx: MockContext) => {
  const status = ctx.searchParams.get("status");
  const needle = (ctx.searchParams.get("search") ?? "").trim().toLowerCase();
  const page = positiveInt(ctx.searchParams.get("page"), 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, positiveInt(ctx.searchParams.get("page_size"), 25));
  const inPeriod = (seed: OrderSeed): boolean => {
    const date = tashkentDate(createdAt(seed, ctx.now));
    return date >= ctx.period.from && date <= ctx.period.to;
  };

  const matches = ORDER_SEEDS.filter(inFilials(ctx))
    .filter(inPeriod)
    .filter((seed) => status === null || seed.status === status)
    .filter((seed) => matchesSearch(seed, needle))
    .sort((a, b) => a.minutesAgo - b.minutesAgo);
  const start = (page - 1) * pageSize;

  return {
    count: matches.length,
    results: matches.slice(start, start + pageSize).map((seed) => toRow(seed, ctx.now)),
  };
};

/* ---------- buyurtma kartasi ---------- */

type Actor = { type: string; id: number | null; name: string | null };
type TimelineDraft = { kind: string; actor: Actor; payload: Record<string, unknown>; at: number };

const SYSTEM: Actor = { type: "system", id: null, name: null };
const LOGIST: Actor = { type: "logist", id: 21, name: "Sarvar Aliyev" };

const ONLINE_METHODS = ["click", "payme"];
const isOnline = (method: string | null): method is string =>
  method !== null && ONLINE_METHODS.includes(method);

const operatorId = (name: string): number | null =>
  sample.operators.find((operator) => operator.name === name)?.id ?? null;

/** Buyurtmani kim yaratgani — manbadan kelib chiqadi (platforma `02` §3). */
const creatorOf = (seed: OrderSeed): Actor => {
  if (seed.source === "mehrigiyo") return { type: "client", id: null, name: seed.client };
  if (seed.source === "doctor")
    return { type: "doctor", id: sample.doctors[0]?.id ?? null, name: sample.doctors[0]?.name ?? null };
  if (seed.source === "reception") return { type: "reception", id: 31, name: "Nigora Rahimova" };
  return { type: "operator", id: seed.operator ? operatorId(seed.operator) : null, name: seed.operator };
};

/** Operator/shifokor yaratgan va mijozda ilova bor — tasdiq ilovada so'raladi (push). */
const needsClientConfirmation = (seed: OrderSeed): boolean =>
  seed.hasApp && (seed.source === "operator" || seed.source === "doctor");

/** Bosqichlar yo'li: `pending` dan hozirgi holatgacha. */
const STATUS_PATH: Record<string, readonly string[]> = {
  pending: [],
  confirmed: ["confirmed"],
  shipping: ["confirmed", "shipping"],
  delivered: ["confirmed", "shipping", "delivered"],
  cancelled: ["cancelled"],
};

const statusChanged = (
  actor: Actor,
  from: string,
  to: string,
  at: number,
  reason: string | null = null,
): TimelineDraft => ({
  kind: "order.status_changed",
  actor,
  payload: { from, to, reason, note: null },
  at,
});

const confirmationEvents = (seed: OrderSeed, from: string, at: number): TimelineDraft[] => {
  const client: Actor = { type: "client", id: null, name: seed.client };

  if (isOnline(seed.paymentMethod) && seed.paymentStatus === "paid") {
    const paid = {
      kind: "payment.paid",
      actor: SYSTEM,
      payload: { method: seed.paymentMethod, provider: seed.paymentMethod, amount: seed.amount },
      at,
    };
    return [paid, statusChanged(SYSTEM, from, "confirmed", at)];
  }
  if (seed.hasApp) {
    const channel = seed.source === "mehrigiyo" ? "app_checkout" : "app_slide";
    const confirmed = {
      kind: "order.confirmed_by_client",
      actor: client,
      payload: { payment_method: seed.paymentMethod, channel },
      at,
    };
    return [confirmed, statusChanged(client, from, "confirmed", at)];
  }
  const staff: Actor = seed.operator
    ? { type: "operator", id: operatorId(seed.operator), name: seed.operator }
    : creatorOf(seed);
  return [statusChanged(staff, from, "confirmed", at)];
};

const transitionEvents = (seed: OrderSeed, from: string, to: string, at: number): TimelineDraft[] => {
  const courier: Actor = { type: "courier", id: null, name: seed.courier };

  switch (to) {
    case "confirmed":
      return confirmationEvents(seed, from, at);
    case "shipping":
      return [
        { kind: "order.courier_assigned", actor: LOGIST, payload: { courier: seed.courier }, at },
        statusChanged(LOGIST, from, to, at),
      ];
    case "delivered": {
      const delivered = statusChanged(courier, from, to, at);
      const isCashPaid = seed.paymentMethod === "cash" && seed.paymentStatus === "paid";
      return isCashPaid
        ? [
            {
              kind: "payment.paid",
              actor: courier,
              payload: { method: "cash", provider: null, amount: seed.amount },
              at,
            },
            delivered,
          ]
        : [delivered];
    }
    default:
      return [statusChanged(creatorOf(seed), from, to, at, to === "cancelled" ? "client_refused" : null)];
  }
};

const orderNumeric = (seed: OrderSeed): number => Number(digitsOf(seed.orderNumber));

const timelineOf = (seed: OrderSeed, now: Date) => {
  const created = createdAt(seed, now).getTime();
  const lastChange = now.getTime() - (seed.statusMinutesAgo ?? Math.round(seed.minutesAgo / 10)) * MINUTE_MS;
  const path = STATUS_PATH[seed.status] ?? [];
  const creator = creatorOf(seed);

  const drafts: TimelineDraft[] = [
    {
      kind: "order.created",
      actor: creator,
      payload: {
        order_number: seed.orderNumber,
        created_by_kind: creator.type,
        confirmation_required: needsClientConfirmation(seed),
      },
      at: created,
    },
  ];
  if (needsClientConfirmation(seed)) {
    drafts.push({
      kind: "notification.sent",
      actor: SYSTEM,
      payload: { kind: "order_confirmation_request", channel: "push" },
      at: created,
    });
  }
  if (seed.paymentStatus === "online_pending") {
    const client: Actor = { type: "client", id: null, name: seed.client };
    drafts.push({
      kind: "payment.method_selected",
      actor: client,
      payload: { method: seed.paymentMethod, provider: seed.paymentMethod },
      at: created,
    });
  }
  path.forEach((to, index) => {
    // O'tishlar yaratilgan vaqt bilan oxirgi holat o'zgarishi orasida teng taqsimlanadi.
    const at = created + ((lastChange - created) * (index + 1)) / path.length;
    drafts.push(...transitionEvents(seed, path[index - 1] ?? "pending", to, at));
  });

  return drafts.map(({ at, ...event }, index) => ({
    id: orderNumeric(seed) * 100 + index,
    ...event,
    created_at: new Date(at).toISOString(),
  }));
};

const ADDRESSES: Record<string, string> = {
  toshkent_shahar: "Chilonzor tumani, 9-mavze, 14-uy",
  toshkent: "Zangiota tumani, Eshonguzar mahallasi",
  samarqand: "Ishtixon tumani, Mitan mahallasi",
  fargona: "Qo'qon shahri, Turkiston ko'chasi, 21-uy",
  andijon: "Asaka tumani, Navoiy ko'chasi, 8-uy",
  namangan: "Chust tumani, Do'stlik mahallasi",
  buxoro: "G'ijduvon tumani, Markaziy ko'cha, 5-uy",
  qashqadaryo: "Qarshi shahri, Mustaqillik ko'chasi, 30-uy",
};

const EXTRA_ITEM_PRICE = 120_000;
const EXTRA_ITEM_FROM = 480_000;

/** Mahsulotlar summasi buyurtma summasiga aynan teng; sovg'a — 0 so'm. */
const itemsOf = (seed: OrderSeed) => {
  const hasExtra = seed.amount > EXTRA_ITEM_FROM;
  const lines = [
    {
      name: "Rayhon krem 50 ml",
      price: hasExtra ? seed.amount - EXTRA_ITEM_PRICE : seed.amount,
      is_gift: false,
    },
    ...(hasExtra ? [{ name: "Immun choy", price: EXTRA_ITEM_PRICE, is_gift: false }] : []),
    { name: "Krem namunasi", price: 0, is_gift: true },
  ];
  return lines.map((line, index) => ({
    id: orderNumeric(seed) * 10 + index,
    product_id: 55 + index,
    quantity: 1,
    unit_price: line.price,
    ...line,
  }));
};

const pendingReasonOf = (seed: OrderSeed): string | null => {
  if (seed.status !== "pending") return null;
  return seed.paymentStatus === "online_pending" ? "awaiting_online_payment" : "awaiting_client_confirmation";
};

const toDetail = (seed: OrderSeed, now: Date) => {
  const creator = creatorOf(seed);
  const filial = MOCK_FILIALS.find((item) => item.name === seed.filial);
  const created = createdAt(seed, now);

  return {
    ...toRow(seed, now),
    pending_reason: pendingReasonOf(seed),
    payment: {
      method: seed.paymentMethod,
      status: seed.paymentStatus,
      paid_amount: seed.paymentStatus === "paid" ? seed.amount : 0,
    },
    created_by: { kind: creator.type, id: creator.id, name: creator.name ?? seed.client },
    responsible_operator: seed.operator ? { id: operatorId(seed.operator), name: seed.operator } : null,
    items: itemsOf(seed),
    total_amount: seed.amount,
    delivery: {
      region: seed.region,
      region_display: regionName(seed.region),
      address_text: ADDRESSES[seed.region] ?? null,
      courier: seed.courier
        ? {
            id: sample.couriers.find((courier) => courier.name === seed.courier)?.id ?? null,
            full_name: seed.courier,
          }
        : null,
      delivery_date: addDays(tashkentDate(created), 1),
    },
    filial: { id: filial?.id ?? null, name: seed.filial },
    timeline: timelineOf(seed, now),
  };
};

const detail = (ctx: MockContext) => {
  const seed = ORDER_SEEDS.find((item) => item.id === ctx.params.id);
  return seed ? toDetail(seed, ctx.now) : mockError(404, "order_not_found");
};

export const ordersHandlers: MockHandler[] = [
  { method: "GET", path: "orders/summary/", resolve: summary },
  { method: "GET", path: "orders/funnel/", resolve: funnel },
  { method: "GET", path: "orders/timeseries/", resolve: timeseries },
  { method: "GET", path: "orders/breakdown/", resolve: breakdown },
  { method: "GET", path: "orders/stage-durations/", resolve: stageDurations },
  { method: "GET", path: "orders/heatmap/", resolve: heatmap },
  { method: "GET", path: "orders/stuck/", resolve: stuck },
  { method: "GET", path: "orders/", resolve: list },
  { method: "GET", path: "orders/:id/", resolve: detail },
];
