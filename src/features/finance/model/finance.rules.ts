import { SEQ_BG } from "@/shared/config/chart-palette";
import type { Timeseries } from "@/shared/lib/envelope";
import { formatNumber } from "@/shared/lib/format";

import type { CashPosition, Debts, Expenses, Liabilities } from "./finance.schema";

/** Ulush foizda, 1 kasr. Butun 0 bo'lsa — 0 (nolga bo'linmaydi). */
export const sharePct = (part: number, whole: number): number =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

const DAY_MS = 86_400_000;

/** Davrdagi kalendar kunlar soni (`YYYY-MM-DD`, ikkala chegara ham kiradi). */
export const periodDays = ({ from, to }: { from: string; to: string }): number => {
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
  return Number.isFinite(days) && days > 0 ? days : 1;
};

/** O'rtacha kunlik kirim: davrda yig'ilgan pul ÷ davr kunlari. */
export const averageDailyInflow = (collected: number, period: { from: string; to: string }): number =>
  Math.round(collected / periodDays(period));

/** Grafikda chiziladigan seriyalar, qat'iy tartibda (`net` chizilmaydi — u ikkalasining farqi). */
export const FLOW_KEYS = ["inflow", "outflow"] as const;
export type FlowKey = (typeof FLOW_KEYS)[number];

/** Kirim — 1-rang (maydon bilan), chiqim — 2-rang. */
export const FLOW_COLOR: Record<FlowKey, number> = { inflow: 0, outflow: 1 };

export const flowSeries = (timeseries: Timeseries): { key: FlowKey; values: number[] }[] =>
  FLOW_KEYS.flatMap((key) => {
    const found = timeseries.series.find((series) => series.key === key);
    return found ? [{ key, values: found.values }] : [];
  });

/** Eng katta xarajat toifasi. Xarajat bo'lmasa — `null`. */
export const biggestExpense = (expenses: Expenses): Expenses["byCategory"][number] | null =>
  expenses.byCategory.reduce<Expenses["byCategory"][number] | null>(
    (top, row) => (row.amount > 0 && (top === null || row.amount > top.amount) ? row : top),
    null,
  );

const sumOf = <Row>(rows: readonly Row[], pick: (row: Row) => number): number =>
  rows.reduce((total, row) => total + pick(row), 0);

/** "Pul qayerda": ro'yxatlardan yig'ma raqamlar (kassalar to'lov turi bo'yicha, kuryerlar, onlayn, qarz). */
export const cashPositionTotals = (position: CashPosition) => {
  const cash = sumOf(position.clinicTills, (till) => till.cash);
  const card = sumOf(position.clinicTills, (till) => till.card);
  const terminal = sumOf(position.clinicTills, (till) => till.terminal);

  return {
    tills: cash + card + terminal,
    cash,
    card,
    terminal,
    courierCod: sumOf(position.courierCod, (row) => row.amount),
    courierCount: position.courierCod.filter((row) => row.amount > 0).length,
    online: position.online.click + position.online.payme,
    openDebt: position.debts.open,
    overdueDebt: position.debts.overdue,
  };
};

/** Jami majburiyat: komissiya + shifokor to'lovlari + keshbek (so'mda) + sovg'alar tannarxi. */
export const totalLiabilities = (liabilities: Liabilities): number =>
  liabilities.operatorCommissionPending +
  liabilities.doctorPayoutsOutstanding +
  liabilities.cashbackPoints.uzsEquivalent +
  liabilities.gifts.costEstimate;

/** To'lov usuli rangi usulga biriktirilgan — filtr o'zgarsa ham rang o'zgarmaydi. */
const PAYMENT_COLOR: Record<string, number> = { cash: 0, click: 1, payme: 2, card: 3, terminal: 4 };
const KNOWN_PAYMENT_COLORS = Object.keys(PAYMENT_COLOR).length;

/** Noma'lum (yangi) usul ma'lumlardan keyingi rangni oladi. */
export const paymentColorIndex = (method: string, position: number): number =>
  PAYMENT_COLOR[method] ?? KNOWN_PAYMENT_COLORS + position;

/** Ochiq qarz: muddat bo'laklari yig'indisi va mijozlar soni. */
export const debtTotals = (debts: Debts): { amount: number; clients: number } => ({
  amount: sumOf(debts.aging, (row) => row.amount),
  clients: sumOf(debts.aging, (row) => row.count),
});

export type AgingBucketKey = "week" | "month" | "older";

const AGING_BUCKET_KEYS: Record<string, AgingBucketKey> = { "0-7": "week", "8-30": "month", "31+": "older" };

/** Backend bo'lagi (`0-7`) → tarjima kaliti. Noma'lum bo'lak — `null` (UI qiymatning o'zini ko'rsatadi). */
export const agingBucketKey = (bucket: string): AgingBucketKey | null => AGING_BUCKET_KEYS[bucket] ?? null;

/** Qarz muddati — tartibli o'lchov: yangi qarz och, eski qarz to'q (bitta rangning qadamlari). */
const AGING_CLASSES = [SEQ_BG[2], SEQ_BG[3], SEQ_BG[5]] as const;

export const agingColorClass = (index: number): string =>
  AGING_CLASSES[Math.min(Math.max(index, 0), AGING_CLASSES.length - 1)] ?? AGING_CLASSES[2];

const OVERDUE_CRITICAL_DAYS = 30;
const OVERDUE_WARNING_DAYS = 7;

/** Muddati o'tgan kunlar → belgi darajasi: 30 kundan ortiq — kritik, 7 kundan ortiq — ogohlantirish. */
export const overdueTone = (days: number): "crit" | "warn" | "neutral" => {
  if (days > OVERDUE_CRITICAL_DAYS) return "crit";
  return days > OVERDUE_WARNING_DAYS ? "warn" : "neutral";
};

export const CLOSING_STATUSES = ["closed", "open", "reopened"] as const;
export type ClosingStatus = (typeof CLOSING_STATUSES)[number];

export const isClosingStatus = (value: string): value is ClosingStatus =>
  (CLOSING_STATUSES as readonly string[]).includes(value);

/** Kassa farqi: kamomad (sanalgan < kutilgan), ortiqcha yoki farqsiz. */
export const differenceKind = (difference: number): "shortage" | "surplus" | "even" => {
  if (difference < 0) return "shortage";
  return difference > 0 ? "surplus" : "even";
};

/** Ishorali summa: `-180000` → `−180 000`, `20000` → `+20 000`, `0` → `0`. */
export const formatSigned = (value: number): string => {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${formatNumber(Math.abs(value))}`;
};

/** `finance/cashflow/` uchun majburiy `group` (`API_QOLLANMA` §9.9): davr uzunligiga qarab. */
export type CashflowGroup = "day" | "week" | "month";

const WEEK_GROUP_FROM_DAYS = 32;
const MONTH_GROUP_FROM_DAYS = 181;

export const cashflowGroup = (params: Readonly<Record<string, unknown>>): CashflowGroup => {
  if (params.period === "year") return "month";
  if (params.period !== "custom") return "day";
  const from = Date.parse(String(params.date_from));
  const to = Date.parse(String(params.date_to));
  if (!Number.isFinite(from) || !Number.isFinite(to)) return "day";
  const days = Math.round((to - from) / DAY_MS) + 1;
  if (days >= MONTH_GROUP_FROM_DAYS) return "month";
  return days >= WEEK_GROUP_FROM_DAYS ? "week" : "day";
};
