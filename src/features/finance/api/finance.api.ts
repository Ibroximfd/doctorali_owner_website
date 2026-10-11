import { parseEnvelope, timeseriesSchema, type Envelope, type Timeseries } from "@/shared/lib/envelope";
import { cashflowGroup } from "../model/finance.rules";
import { apiGet, type QueryParams } from "@/shared/lib/http";

import {
  cashPositionSchema,
  dailyClosingsSchema,
  debtsSchema,
  expensesSchema,
  financeSummarySchema,
  liabilitiesSchema,
  paymentMixSchema,
  returnsSchema,
  type CashPosition,
  type DailyClosing,
  type Debts,
  type Expenses,
  type FinanceSummary,
  type Liabilities,
  type PaymentMixRow,
  type Returns,
} from "../model/finance.schema";

export const loadFinanceSummary = async (params: QueryParams): Promise<Envelope<FinanceSummary>> =>
  parseEnvelope(financeSummarySchema, await apiGet("finance/summary/", params));

/** Kirim (`inflow`), chiqim (`outflow`) va farq (`net`) — davr bo'yicha. */
export const loadCashflow = async (params: QueryParams): Promise<Envelope<Timeseries>> =>
  parseEnvelope(
    timeseriesSchema,
    await apiGet("finance/cashflow/", { ...params, group: cashflowGroup(params) }),
  );

export const loadCashPosition = async (params: QueryParams): Promise<Envelope<CashPosition>> =>
  parseEnvelope(cashPositionSchema, await apiGet("finance/cash-position/", params));

export const loadPaymentMix = async (params: QueryParams): Promise<Envelope<PaymentMixRow[]>> =>
  parseEnvelope(paymentMixSchema, await apiGet("finance/payment-mix/", params));

export const loadExpenses = async (params: QueryParams): Promise<Envelope<Expenses>> =>
  parseEnvelope(expensesSchema, await apiGet("finance/expenses/", params));

export const loadLiabilities = async (params: QueryParams): Promise<Envelope<Liabilities>> =>
  parseEnvelope(liabilitiesSchema, await apiGet("finance/liabilities/", params));

export const loadReturns = async (params: QueryParams): Promise<Envelope<Returns>> =>
  parseEnvelope(returnsSchema, await apiGet("finance/returns/", params));

export const loadDebts = async (params: QueryParams): Promise<Envelope<Debts>> =>
  parseEnvelope(debtsSchema, await apiGet("finance/debts/", params));

export const loadDailyClosings = async (params: QueryParams): Promise<Envelope<DailyClosing[]>> =>
  parseEnvelope(dailyClosingsSchema, await apiGet("finance/daily-closings/", params));
