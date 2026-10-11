import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { metricSchema } from "@/shared/lib/envelope";

/**
 * Moliya endpointlari (`02_BACKEND_TZ` §4.4). Sxema faqat ekran o'qiydigan
 * maydonlarni tekshiradi — shartnomadagi qolgan maydonlar (`by_channel`,
 * `by_filial`, `by_reason` …) kelsa ham e'tiborsiz qoladi.
 */

/** `GET /finance/summary/` — sahifaning to'rtta asosiy raqami. */
export const financeSummarySchema = z.object({
  revenue: metricSchema,
  collected: metricSchema,
  expenses: metricSchema,
  net_cash: metricSchema,
  refunds: metricSchema,
  /** KPI kataklaridagi mini trend (shartnomaga qo'shimcha; bo'lmasa chizilmaydi). */
  sparklines: z.record(z.array(z.number())).default({}),
});
export type FinanceSummary = Camelized<z.infer<typeof financeSummarySchema>>;

/** `GET /finance/cash-position/` — pul hozir qayerda (davrga bog'liq emas). */
export const cashPositionSchema = z.object({
  clinic_tills: z.array(
    z.object({
      filial: z.string(),
      cash: z.number(),
      card: z.number(),
      terminal: z.number(),
      closed_today: z.boolean(),
    }),
  ),
  courier_cod: z.array(
    z.object({
      courier: z.string(),
      filial: z.string().nullable(),
      amount: z.number(),
      oldest_at: z.string().nullable(),
      orders: z.number(),
    }),
  ),
  online: z.object({ click: z.number(), payme: z.number(), pending: z.number() }),
  debts: z.object({ open: z.number(), overdue: z.number(), due_week: z.number() }),
});
export type CashPosition = Camelized<z.infer<typeof cashPositionSchema>>;

/** `GET /finance/payment-mix/`. To'lov usuli — ochiq ro'yxat (yangi usul yiqitmaydi). */
export const paymentMixSchema = z.array(
  z.object({ method: z.string(), amount: z.number(), count: z.number(), share_pct: z.number() }),
);
export type PaymentMixRow = Camelized<z.infer<typeof paymentMixSchema>>[number];

/** `GET /finance/expenses/`. */
export const expensesSchema = z.object({
  total: metricSchema,
  by_category: z.array(
    z.object({
      category: z.string(),
      amount: z.number(),
      share_pct: z.number(),
      previous: z.number().nullable(),
    }),
  ),
});
export type Expenses = Camelized<z.infer<typeof expensesSchema>>;

/** `GET /finance/liabilities/` — hali to'lanmagan majburiyatlar (hozirgi holat). */
export const liabilitiesSchema = z.object({
  operator_commission_pending: z.number(),
  doctor_payouts_outstanding: z.number(),
  /** To'lov kutayotgan shifokorlar soni (shartnomaga qo'shimcha; bo'lmasa izoh chiqmaydi). */
  doctors_waiting: z.number().nullable().default(null),
  cashback_points: z.object({
    points: z.number(),
    uzs_equivalent: z.number(),
    expiring_this_month: z.number(),
  }),
  gifts: z.object({ count: z.number(), cost_estimate: z.number() }),
});
export type Liabilities = Camelized<z.infer<typeof liabilitiesSchema>>;

/** `GET /finance/returns/` — bu sahifaga faqat yig'ma raqamlar kerak. */
export const returnsSchema = z.object({ count: z.number(), refund_amount: z.number() });
export type Returns = Camelized<z.infer<typeof returnsSchema>>;

/** `GET /finance/debts/` — qarz muddatlari va eng katta qarzdorlar. */
export const debtsSchema = z.object({
  aging: z.array(z.object({ bucket: z.string(), amount: z.number(), count: z.number() })),
  top_debtors: z.array(
    z.object({
      client: z.string(),
      phone: z.string().nullable(),
      filial: z.string().nullable(),
      remaining: z.number(),
      overdue_days: z.number(),
    }),
  ),
});
export type Debts = Camelized<z.infer<typeof debtsSchema>>;
export type Debtor = Debts["topDebtors"][number];

/** `GET /finance/daily-closings/`. Ochiq (hali yopilmagan) kunda sanalgan naqd va farq bo'lmaydi. */
export const dailyClosingsSchema = z.array(
  z.object({
    date: z.string(),
    filial: z.string(),
    status: z.string(),
    expected_cash: z.number(),
    counted_cash: z.number().nullable(),
    difference: z.number().nullable(),
    closed_by: z.string().nullable(),
    closed_at: z.string().nullable(),
  }),
);
export type DailyClosing = Camelized<z.infer<typeof dailyClosingsSchema>>[number];
