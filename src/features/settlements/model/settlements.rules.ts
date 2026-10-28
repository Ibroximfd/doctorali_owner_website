export const SETTLEMENT_STATUSES = ["overdue", "debt", "partial", "paid"] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const isSettlementStatus = (value: string): value is SettlementStatus =>
  SETTLEMENT_STATUSES.some((known) => known === value);

/** Qarz muddatlari tartibi (yangidan eskiga). Noma'lum kalit oxirida. */
export const AGING_KEYS = ["0_7", "8_30", "31_60", "60_plus"] as const;
export type AgingKey = (typeof AGING_KEYS)[number];

export const isAgingKey = (value: string): value is AgingKey => AGING_KEYS.some((known) => known === value);

/** To'langan ulush, 0–100: kutilgan summa 0 bo'lsa — to'liq (qarz yo'q). */
export const paidPercent = (paid: number, netDue: number): number =>
  netDue <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((paid / netDue) * 100)));

/** Qarzdorlar birinchi: eng katta qarz tepada, keyin to'langanlar nomi bo'yicha emas — kutilgan summa bo'yicha. */
export const byDebtDesc = <Row extends { debt: number; netDue: number }>(rows: readonly Row[]): Row[] =>
  [...rows].sort((a, b) => b.debt - a.debt || b.netDue - a.netDue);

/** 30 kundan oshgan qarz — kechikkan. */
export const OVERDUE_DAYS = 30;
