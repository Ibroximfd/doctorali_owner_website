import { envelope, type MockContext } from "../engine";
import { codeOf } from "../structure-v2";
import { type MockHandler } from "../types";
import { chiefMoney, filialFlow, pct, selectedFilials, totalsOf } from "../v2-metrics";

/**
 * «Umumiy» — `overview/v2/` (B-11). Aniq shakl hujjatda yo'q — namuna panel o'qiydigan shaklda;
 * haqiqiy javob olingach shu fayl moslanadi.
 */

/** O'tgan davrga nisbatan o'zgarish (namuna): ko'rsatkich bo'yicha barqaror farq. */
const DELTAS = {
  revenue: 7.4,
  leads: 5.2,
  sold: 6.1,
  in_transit: -3.5,
  delivered: 8.3,
  cancelled: 4.6,
} as const;

const overview = (ctx: MockContext) => {
  const filials = selectedFilials(ctx).map((filial) => ({ filial, flow: filialFlow(ctx, filial.id) }));
  const flows = filials.map((row) => row.flow);
  const total = totalsOf(flows, [
    "leads",
    "leadSold",
    "sold",
    "inTransit",
    "delivered",
    "cancelled",
    "revenue",
  ]);
  const money = totalsOf(
    filials.flatMap((row) => chiefMoney(ctx, row.filial.id, "all")),
    ["atCouriers", "atChief", "handed"],
  );
  const conversion = pct(total.leadSold, total.leads) ?? 0;
  const cancelRate = pct(total.cancelled, total.sold) ?? 0;

  return envelope(ctx, {
    revenue: ctx.metric(total.revenue, DELTAS.revenue, "uzs"),
    money: { at_couriers: money.atCouriers, at_chiefs: money.atChief, handed: money.handed },
    orders: {
      leads: ctx.metric(total.leads, DELTAS.leads, "count"),
      sold: ctx.metric(total.sold, DELTAS.sold, "count"),
      in_transit: ctx.metric(total.inTransit, DELTAS.in_transit, "count"),
      delivered: ctx.metric(total.delivered, DELTAS.delivered, "count"),
      cancelled: ctx.metric(total.cancelled, DELTAS.cancelled, "count"),
    },
    conversion: ctx.metric(conversion, 1.8, "pct"),
    cancel_rate: ctx.metric(cancelRate, -2.1, "pct"),
    filials: filials.map(({ filial, flow }) => ({
      id: filial.id,
      code: codeOf(filial),
      name: filial.name,
      is_main: filial.is_main,
      sold: flow.sold,
      delivered: flow.delivered,
      cancelled: flow.cancelled,
      revenue: flow.revenue,
      conversion_pct: pct(flow.leadSold, flow.leads),
      cancel_rate_pct: pct(flow.cancelled, flow.sold),
    })),
  });
};

export const overviewHandlers: MockHandler[] = [{ method: "GET", path: "overview/v2/", resolve: overview }];
