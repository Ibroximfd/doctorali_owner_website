import { envelope, rng, type MockContext } from "../engine";
import { OPERATORS, filialsState, codeOf } from "../structure-v2";
import { type MockHandler } from "../types";
import { appFlow, scaled, selectedFilials, totalsOf } from "../v2-metrics";

/**
 * «Ilova» — mobil ilova statistikasi (egasi talabi). Zakaz va pul raqamlari `appFlow` dan —
 * Moliya / Analitikadagi «Ilovadan» filtri bilan bir manba, raqamlar aynan mos. `app/v2/` (B-14)
 * aniq shakli hujjatda yo'q — haqiqiy javob olingach shu fayl moslanadi.
 */

const orders = (ctx: MockContext) => {
  const rows = selectedFilials(ctx).map((filial) => ({ filial, flow: appFlow(ctx, filial.id) }));
  const total = totalsOf(
    rows.map((row) => row.flow),
    ["pending", "confirmed", "inTransit", "delivered", "cancelled", "sold", "revenue"],
  );
  const received = total.pending + total.sold;
  return {
    total: received,
    revenue: total.revenue,
    statuses: {
      pending: total.pending,
      confirmed: total.confirmed,
      in_transit: total.inTransit,
      delivered: total.delivered,
      cancelled: total.cancelled,
    },
    trend: {
      labels: ctx.period.labels,
      orders: ctx.series(received, 51),
      delivered: ctx.series(total.delivered, 53),
    },
    filials: rows.map(({ filial, flow }) => ({
      id: filial.id,
      code: codeOf(filial),
      name: filial.name,
      total: flow.pending + flow.sold,
      delivered: flow.delivered,
      cancelled: flow.cancelled,
      revenue: flow.revenue,
    })),
  };
};

const USERS_TOTAL = 48_260;
const DAU_BASE = 6_200;
const MAU_BASE = 41_500;

/**
 * DAU — davrdagi o'rtacha kunlik aktiv, MAU — oxirgi 30 kun (joriy ko'rsatkichlar; kunlik qatori
 * backendda yo'q, B-20). `trend` — yangi foydalanuvchilar davr bo'yicha.
 */
const users = (ctx: MockContext) => {
  const random = rng(97);
  const count = ctx.period.labels.length;
  const isHourly = ctx.period.granularity === "hour";
  const dau = ctx.period.labels.map((_, index) => {
    const growth = 0.94 + (0.08 * index) / Math.max(1, count - 1);
    return Math.round((isHourly ? DAU_BASE / 9 : DAU_BASE) * growth * (0.9 + random() * 0.2));
  });
  const average = dau.length ? Math.round(dau.reduce((sum, value) => sum + value, 0) / dau.length) : 0;
  return {
    users_total: USERS_TOTAL,
    new_users: scaled(ctx, 2_640),
    dau: isHourly ? DAU_BASE : average,
    mau: MAU_BASE,
    trend: { labels: ctx.period.labels, new: ctx.series(scaled(ctx, 2_640), 59) },
  };
};

/** Operator ilovaga olib kirgan foydalanuvchilar (havola / promokod) va ulardan zakaz berganlari. */
const INVITE_RATE: Record<number, number> = {
  401: 0.31,
  402: 0.18,
  403: 0.24,
  411: 0.36,
  412: 0.22,
  421: 0.12,
};

const operators = (ctx: MockContext) => {
  const filials = filialsState();
  return OPERATORS.map((operator) => {
    const filial = filials.find((item) => item.id === operator.filial);
    const invited = scaled(ctx, Math.round(operator.sold * (INVITE_RATE[operator.id] ?? 0.15)));
    return {
      id: operator.id,
      full_name: operator.full_name,
      filial_id: operator.filial,
      filial_code: filial?.code ?? "",
      filial_name: filial?.name ?? "",
      invited,
      ordered: Math.round(invited * (0.38 + (operator.id % 7) * 0.04)),
    };
  });
};

/** `app/v2/` (B-14) — bitta javob: zakazlar, foydalanuvchilar, operator referali. */
const appV2 = (ctx: MockContext) =>
  envelope(ctx, { orders: orders(ctx), users: users(ctx), operators: operators(ctx) });

export const appHandlers: MockHandler[] = [{ method: "GET", path: "app/v2/", resolve: appV2 }];
