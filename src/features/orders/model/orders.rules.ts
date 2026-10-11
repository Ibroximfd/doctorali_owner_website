import { STATUS_COLORS, seriesColor } from "@/shared/config/chart-palette";
import { orderStatusStyle } from "@/shared/config/order-status";

import type { BreakdownRow, HeatmapCell, OrderDetail, StuckOrder, TimelineEvent } from "./orders.schema";

/* ---------- trend ---------- */

/** Grafikdagi seriyalar va ranglari. `delivered_amount` boshqa birlikda (so'm) — bitta o'qqa qo'shilmaydi. */
const TREND_COLOR = {
  created: seriesColor(0),
  delivered: STATUS_COLORS.delivered,
  cancelled: STATUS_COLORS.cancelled,
} as const;
export type TrendKey = keyof typeof TREND_COLOR;

const isTrendKey = (key: string): key is TrendKey => key in TREND_COLOR;

export const trendSeries = <Series extends { key: string }>(
  series: readonly Series[],
): (Series & { key: TrendKey; color: string })[] =>
  series.flatMap((item) =>
    isTrendKey(item.key) ? [{ ...item, key: item.key, color: TREND_COLOR[item.key] }] : [],
  );

/* ---------- taqsimotlar ---------- */

export const totalCount = (rows: readonly BreakdownRow[]): number =>
  rows.reduce((sum, row) => sum + row.count, 0);

export const hasNoCounts = (rows: readonly { count: number }[]): boolean =>
  rows.every((row) => row.count === 0);

const byCountDesc = (a: BreakdownRow, b: BreakdownRow): number => b.count - a.count;

export const topRows = (rows: readonly BreakdownRow[], limit: number): BreakdownRow[] =>
  [...rows].sort(byCountDesc).slice(0, limit);

/**
 * Uzun ro'yxatni qisqartiradi: eng kattalari alohida, qolgani bitta "boshqa" qatorga.
 * Faqat bitta qator ortib qolsa yig'ilmaydi — "boshqa" uning o'rnini egallab, hech narsa tejamaydi.
 */
export const collapseTail = (
  rows: readonly BreakdownRow[],
  visible: number,
): { head: BreakdownRow[]; restCount: number } => {
  const sorted = [...rows].sort(byCountDesc);
  if (sorted.length <= visible + 1) return { head: sorted, restCount: 0 };
  return { head: sorted.slice(0, visible), restCount: totalCount(sorted.slice(visible)) };
};

/** Mijoz ilovadagi 3 bosqichli oqim orqali o'zi bekor qilgani (platforma `02` §2.5 — faqat shu ikki sabab mijozniki). */
export const clientCancellations = (
  rows: readonly BreakdownRow[],
): { staff: number; product: number; total: number } => {
  const countOf = (key: string): number => rows.find((row) => row.key === key)?.count ?? 0;
  const staff = countOf("staff_issue");
  const product = countOf("product_issue");
  return { staff, product, total: staff + product };
};

/** Tasdiqlash kanali rangi kanalga biriktirilgan — filtr o'zgarsa ham o'sha rangda qoladi. */
const CONFIRMATION_COLOR: Record<string, number> = {
  app_slide: 0,
  phone: 1,
  app_checkout: 2,
  payment_webhook: 3,
  crm_force: 4,
};

export const confirmationColorIndex = (key: string, position: number): number =>
  CONFIRMATION_COLOR[key] ?? Object.keys(CONFIRMATION_COLOR).length + position;

/* ---------- bosqich vaqtlari ---------- */

/** O'lchagich maqsadning 1,5 baravarigacha ko'rsatadi — maqsad belgisi doim 2/3 da turadi. */
const METER_RANGE = 1.5;

export const stageMeter = (
  p50Min: number,
  targetMin: number,
): { value: number; marker: number; isOver: boolean } => ({
  value: targetMin > 0 ? Math.min(100, (p50Min / (targetMin * METER_RANGE)) * 100) : 0,
  marker: 100 / METER_RANGE,
  isOver: p50Min > targetMin,
});

/* ---------- issiqlik jadvali ---------- */

export const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

const BUCKET_HOURS = 2;
const BUCKETS_PER_DAY = 24 / BUCKET_HOURS;

const pad = (value: number): string => String(value).padStart(2, "0");

/** `3` → `06:00–08:00`. */
export const bucketRange = (bucket: number): string =>
  `${pad(bucket * BUCKET_HOURS)}:00–${pad((bucket + 1) * BUCKET_HOURS)}:00`;

/** Ustun yorliqlari: har ikkinchi ustunda soat (`00`, bo'sh, `04` …) — tor joyda ustma-ust tushmaydi. */
export const bucketLabels = (): string[] =>
  Array.from({ length: BUCKETS_PER_DAY }, (_, bucket) =>
    bucket % 2 === 0 ? pad(bucket * BUCKET_HOURS) : "",
  );

/** Soatlik kataklarni hafta kuni × 2 soatlik oraliqqa yig'adi. Noto'g'ri kun/soat tashlab yuboriladi. */
export const heatmapGrid = (cells: readonly HeatmapCell[]): { weekday: WeekdayKey; buckets: number[] }[] => {
  const grid = WEEKDAY_KEYS.map((weekday) => ({
    weekday,
    buckets: Array.from({ length: BUCKETS_PER_DAY }, () => 0),
  }));
  for (const cell of cells) {
    const row = grid[cell.weekday - 1];
    const bucket = Math.floor(cell.hour / BUCKET_HOURS);
    if (row === undefined || row.buckets[bucket] === undefined) continue;
    row.buckets[bucket] += cell.count;
  }
  return grid;
};

/* ---------- qotib qolgan buyurtmalar ---------- */

export const oldestFirst = (rows: readonly StuckOrder[]): StuckOrder[] =>
  [...rows].sort((a, b) => b.hoursInStatus - a.hoursInStatus);

export type StuckHolder = { kind: "person"; name: string } | { kind: "no_courier" } | { kind: "nobody" };

/** Buyurtma hozir kimda: tasdiq kutilayotgan bo'lsa — operatorda, undan keyin — kuryerda (yoki hali kuryersiz). */
export const stuckHolder = (row: Pick<StuckOrder, "status" | "operator" | "courier">): StuckHolder => {
  const name = row.status === "pending" ? row.operator : row.courier;
  if (name) return { kind: "person", name };
  return row.status === "pending" ? { kind: "nobody" } : { kind: "no_courier" };
};

/* ---------- buyurtma kartasi ---------- */

export type PaymentTone = "good" | "warn" | "info" | "neutral";

const PAYMENT_TONE: Record<string, PaymentTone> = {
  paid: "good",
  cod_pending: "warn",
  online_pending: "info",
};

/** Noma'lum to'lov holati neytral — "to'langan" deb taxmin qilinmaydi. */
export const paymentTone = (status: string): PaymentTone => PAYMENT_TONE[status] ?? "neutral";

/**
 * Kutish sababi faqat `pending` da ma'noli. Onlayn to'lov kutilayotgani to'lov
 * belgisida allaqachon yozilgan — ikki marta ko'rsatilmaydi.
 */
export const pendingReasonToShow = (
  order: Pick<OrderDetail, "status" | "pendingReason" | "payment">,
): string | null => {
  if (order.status !== "pending" || !order.pendingReason) return null;
  const isSaidByPayment =
    order.pendingReason === "awaiting_online_payment" && order.payment.status === "online_pending";
  return isSaidByPayment ? null : order.pendingReason;
};

/* ---------- tarix lentasi ---------- */

/** Eng yangi hodisa yuqorida; bir vaqtda yozilganlar — keyingi yozilgani birinchi. */
export const newestFirst = (events: readonly TimelineEvent[]): TimelineEvent[] =>
  [...events].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id);

const text = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Hodisa sarlavhasi kaliti (`orders.timeline.*` ichida). Holat o'zgarishi yangi
 * holat nomi bilan ataladi; qolganlari — turi bilan (`order.created` → `kinds.order_created`,
 * tarjima kalitida nuqta bo'lmaydi). UI tarjima topmasa hodisa turini o'zini ko'rsatadi.
 */
export const timelineTitleKeys = (event: Pick<TimelineEvent, "kind" | "payload">): string[] => {
  const kindKey = `kinds.${event.kind.replaceAll(".", "_")}`;
  const to = text(event.payload.to);
  return event.kind === "order.status_changed" && to ? [`status.${to}`, kindKey] : [kindKey];
};

/** Tailwind klasslari to'liq yozilgan — dinamik qurilsa kompilyator ularni topmaydi. */
const KIND_DOT: Record<string, string> = {
  "order.confirmed_by_client": "bg-order-confirmed",
  "order.courier_assigned": "bg-order-shipping",
  "notification.sent": "bg-info",
  "order.confirmation_reminder_sent": "bg-info",
  "payment.paid": "bg-good",
  "payment.failed": "bg-crit",
};

export const timelineDotClass = (event: Pick<TimelineEvent, "kind" | "payload">): string => {
  const to = text(event.payload.to);
  if (event.kind === "order.status_changed" && to) return orderStatusStyle(to).dot;
  return KIND_DOT[event.kind] ?? "bg-ink-3";
};

export type TimelineFacts = {
  channel: string | null;
  paymentMethod: string | null;
  amount: number | null;
  courier: string | null;
  reason: string | null;
  note: string | null;
};

const courierName = (value: unknown): string | null => {
  if (!isRecord(value)) return text(value);
  return text(value.fullName) ?? text(value.name);
};

/** Hodisa `payload` idan (shakli hodisa turiga bog'liq, kalitlar camelCase) ko'rsatishga arziydigan faktlar. */
export const timelineFacts = (payload: Record<string, unknown>): TimelineFacts => ({
  channel: text(payload.channel),
  paymentMethod: text(payload.paymentMethod) ?? text(payload.method),
  amount: typeof payload.amount === "number" ? payload.amount : null,
  courier: courierName(payload.courier),
  reason: text(payload.reason),
  note: text(payload.note),
});
