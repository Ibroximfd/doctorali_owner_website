import { addDays } from "@/shared/lib/scope";

import { envelope, sparkline, type MockContext } from "../engine";
import { sample } from "../sample";
import type { MockHandler } from "../types";
import { channelBase } from "./overview";

const HOUR_MS = 3_600_000;

const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

/** `total` ni vaznlarga mutanosib bo'ladi; yaxlitlash qoldig'i oxirgi bo'lakka — yig'indi aynan `total`. */
const splitExact = (total: number, weights: readonly number[]): number[] => {
  if (weights.length === 0) return [];
  const weightSum = sum(weights) || 1;
  const head = weights.slice(0, -1).map((weight) => Math.round((total * weight) / weightSum));
  return [...head, total - sum(head)];
};

/** `ctx.series` har nuqtani yaxlitlaydi; qoldiq eng katta nuqtaga qo'shiladi — qator yig'indisi aynan `total`. */
const exactSeries = (ctx: MockContext, total: number, seed: number, growth?: number): number[] => {
  const values = ctx.series(total, seed, growth);
  const rest = total - sum(values);
  if (rest === 0) return values;
  const peak = values.indexOf(Math.max(...values));
  return values.map((value, index) => (index === peak ? value + rest : value));
};

/** Jami tushum `overview/` dagi bilan aynan bir xil hisoblanadi — sahifalar orasida raqam mos. */
const revenueChannels = (ctx: MockContext) => {
  const base = channelBase(ctx);
  const scale = ctx.period.scale;
  return {
    delivery: Math.round(base.delivery * scale),
    clinic: Math.round(base.clinic * scale),
    consultation: Math.round(base.consultation * scale),
  };
};

const revenueTotal = (ctx: MockContext): number => {
  const channels = revenueChannels(ctx);
  return channels.delivery + channels.clinic + channels.consultation;
};

const collectedTotal = (ctx: MockContext): number => ctx.flow(sample.finance.collected);

const expenseRows = (ctx: MockContext) =>
  sample.expenses.map((row) => ({ category: row.category, amount: ctx.flow(row.amount) }));

/** Xarajat jami — toifalar yig'indisi (summary, expenses va cashflow shu bitta raqamdan oladi). */
const expensesTotal = (ctx: MockContext): number => sum(expenseRows(ctx).map((row) => row.amount));

const summary = (ctx: MockContext) => {
  const channels = revenueChannels(ctx);
  const collected = collectedTotal(ctx);
  const expenses = expensesTotal(ctx);

  return envelope(ctx, {
    revenue: ctx.metric(revenueTotal(ctx), 10.6, "uzs"),
    collected: ctx.metric(collected, 10, "uzs"),
    expenses: ctx.metric(expenses, 3.5, "uzs"),
    net_cash: ctx.metric(collected - expenses, 11.6, "uzs"),
    refunds: ctx.metric(ctx.flow(sample.finance.refunds), -6.4, "uzs"),
    by_channel: {
      delivery: ctx.metric(channels.delivery, 11.2, "uzs"),
      clinic: ctx.metric(channels.clinic, 7.8, "uzs"),
      consultation: ctx.metric(channels.consultation, 4.9, "uzs"),
    },
    sparklines: {
      revenue: sparkline(41),
      collected: sparkline(42),
      expenses: sparkline(43, 0.1),
      net_cash: sparkline(44),
    },
  });
};

const cashflow = (ctx: MockContext) => {
  const inflow = exactSeries(ctx, collectedTotal(ctx), 51);
  const outflow = exactSeries(ctx, expensesTotal(ctx), 52, 0.05);

  return envelope(ctx, {
    labels: ctx.period.labels,
    series: [
      { key: "inflow", values: inflow },
      { key: "outflow", values: outflow },
      { key: "net", values: inflow.map((value, index) => value - (outflow[index] ?? 0)) },
    ],
    compare: null,
  });
};

/** Klinika kassalari hozir (filial bo'yicha). Yig'indisi `sample.cash.tills` ga teng. */
const TILLS = [
  { filialId: 1, cash: 7_100_000, card: 2_600_000, terminal: 1_900_000 },
  { filialId: 2, cash: 4_100_000, card: 1_500_000, terminal: 1_200_000 },
] as const;

const ONLINE_PENDING = 1_240_000;
const COD_PER_ORDER = 375_000;

const isSelected = (ctx: MockContext, filialId: number): boolean =>
  ctx.filials.some((filial) => filial.id === filialId);

const filialName = (ctx: MockContext, filialId: number): string =>
  ctx.filials.find((filial) => filial.id === filialId)?.name ?? "";

/** Qarz faqat klinikasi bor filiallarda yuradi: tanlangan filiallarning ochiq qarzdagi ulushi. */
const debtShare = (ctx: MockContext): number => {
  const branches = sample.clinic.branches;
  const total = sum(branches.map((branch) => branch.openDebt));
  const selected = sum(
    branches.filter((branch) => isSelected(ctx, branch.filialId)).map((branch) => branch.openDebt),
  );
  return total > 0 ? selected / total : 0;
};

const agingRows = (ctx: MockContext) => {
  const share = debtShare(ctx);
  return sample.debtAging.map((row) => ({
    bucket: row.bucket,
    amount: Math.round(row.amount * share),
    count: Math.round(row.count * share),
  }));
};

const cashPosition = (ctx: MockContext) => {
  const share = debtShare(ctx);

  return envelope(ctx, {
    clinic_tills: TILLS.filter((till) => isSelected(ctx, till.filialId)).map((till) => ({
      filial: filialName(ctx, till.filialId),
      cash: till.cash,
      card: till.card,
      terminal: till.terminal,
      closed_today: false,
    })),
    courier_cod: sample.couriers
      .filter(
        (courier) => courier.codUnsettled > 0 && ctx.filials.some((filial) => filial.name === courier.filial),
      )
      .map((courier) => {
        const amount = Math.round(courier.codUnsettled);
        return {
          courier: courier.name,
          filial: courier.filial,
          amount,
          oldest_at: new Date(ctx.now.getTime() - (courier.unsettledDays * 24 + 5) * HOUR_MS).toISOString(),
          orders: Math.max(1, Math.round(amount / COD_PER_ORDER)),
        };
      }),
    online: {
      click: ctx.stock(sample.cash.online.click),
      payme: ctx.stock(sample.cash.online.payme),
      pending: ctx.stock(ONLINE_PENDING),
    },
    debts: {
      open: sum(agingRows(ctx).map((row) => row.amount)),
      overdue: Math.round(sample.cash.overdueDebt * share),
      due_week: Math.round(sample.cash.dueWeek * share),
    },
  });
};

const paymentMix = (ctx: MockContext) => {
  const revenue = revenueTotal(ctx);
  // To'lov usullari yig'indisi jami tushumga teng — "tushum qaysi yo'l bilan to'landi".
  const amounts = splitExact(
    revenue,
    sample.paymentMix.map((row) => row.amount),
  );

  return envelope(
    ctx,
    sample.paymentMix.map((row, index) => {
      const amount = amounts[index] ?? 0;
      return { method: row.method, amount, count: ctx.flow(row.count), share_pct: pct(amount, revenue) };
    }),
  );
};

const expenses = (ctx: MockContext) => {
  const rows = expenseRows(ctx);
  const total = expensesTotal(ctx);
  const byFilial = splitExact(
    total,
    ctx.filials.map((filial) => filial.share),
  );

  return envelope(ctx, {
    total: ctx.metric(total, 3.5, "uzs"),
    by_category: rows.map((row) => ({
      category: row.category,
      amount: row.amount,
      share_pct: pct(row.amount, total),
      previous: ctx.compare === "none" ? null : Math.round(row.amount / 1.035),
    })),
    by_filial: ctx.filials.map((filial, index) => {
      const amount = byFilial[index] ?? 0;
      return { filial: filial.name, amount, share_pct: pct(amount, total) };
    }),
  });
};

const liabilities = (ctx: MockContext) => {
  const source = sample.liabilities;

  return envelope(ctx, {
    operator_commission_pending: ctx.stock(source.operatorCommissionPending),
    doctor_payouts_outstanding: ctx.stock(source.doctorPayoutsOutstanding),
    doctors_waiting: ctx.stock(source.doctorsWaiting),
    cashback_points: {
      points: ctx.stock(source.cashbackPoints),
      uzs_equivalent: ctx.stock(source.cashbackUzs),
      expiring_this_month: ctx.stock(source.cashbackExpiringPoints),
    },
    gifts: { count: ctx.stock(source.giftsCount), cost_estimate: ctx.stock(source.giftsCost) },
  });
};

const returns = (ctx: MockContext) =>
  envelope(ctx, {
    count: ctx.flow(sample.finance.refundCount),
    refund_amount: ctx.flow(sample.finance.refunds),
    by_reason: [],
    list: [],
  });

/** Davrda undirilgan va yangi berilgan qarz (30 kunlik asos). */
const DEBT_FLOW = { collected: 24_600_000, issued: 27_900_000 } as const;

const debts = (ctx: MockContext) => {
  const flowScale = ctx.period.scale * debtShare(ctx);

  return envelope(ctx, {
    aging: agingRows(ctx),
    top_debtors: sample.debtors
      .filter((debtor) => ctx.filials.some((filial) => filial.name === debtor.filial))
      .map((debtor) => ({
        client: debtor.client,
        phone: debtor.phone,
        filial: debtor.filial,
        remaining: Math.round(debtor.remaining),
        overdue_days: debtor.overdueDays,
      })),
    collected: ctx.metric(Math.round(DEBT_FLOW.collected * flowScale), 6.2, "uzs"),
    issued: ctx.metric(Math.round(DEBT_FLOW.issued * flowScale), -2.8, "uzs"),
  });
};

/** Kun yakunida kassada kutilgan naqd (filial bo'yicha asos). */
const EXPECTED_CASH: Record<string, number> = { Toshkent: 6_840_000, "Qo'qon": 3_920_000 };
const EXPECTED_CASH_STEP = 115_000;

/** Kassa yopilishlari tanlangan davr va filial ichida; bugungi kun hali yopilmagan. */
const dailyClosings = (ctx: MockContext) =>
  envelope(
    ctx,
    sample.closings
      .map((row) => ({ ...row, date: addDays(ctx.today, -row.daysAgo) }))
      .filter(
        (row) =>
          row.date >= ctx.period.from &&
          row.date <= ctx.period.to &&
          ctx.filials.some((filial) => filial.name === row.filial),
      )
      .map((row) => {
        const expected = (EXPECTED_CASH[row.filial] ?? 0) + row.daysAgo * EXPECTED_CASH_STEP;
        return {
          date: row.date,
          filial: row.filial,
          status: row.status,
          expected_cash: expected,
          counted_cash: expected + row.difference,
          difference: row.difference,
          closed_by: row.closedBy,
          closed_at: `${row.date}T20:10:00+05:00`,
        };
      }),
  );

/** `finance` bo'limi namunalari (`02_BACKEND_TZ` §4.4). */
export const financeHandlers: MockHandler[] = [
  { method: "GET", path: "finance/summary/", resolve: summary },
  { method: "GET", path: "finance/cashflow/", resolve: cashflow },
  { method: "GET", path: "finance/cash-position/", resolve: cashPosition },
  { method: "GET", path: "finance/payment-mix/", resolve: paymentMix },
  { method: "GET", path: "finance/expenses/", resolve: expenses },
  { method: "GET", path: "finance/liabilities/", resolve: liabilities },
  { method: "GET", path: "finance/returns/", resolve: returns },
  { method: "GET", path: "finance/debts/", resolve: debts },
  { method: "GET", path: "finance/daily-closings/", resolve: dailyClosings },
];
