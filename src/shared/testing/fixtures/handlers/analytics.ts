import { apportion, envelope, type MockContext } from "../engine";
import { PRODUCTS, PRODUCT_WEIGHTS, codeOf } from "../structure-v2";
import { type MockHandler } from "../types";
import { filialFlow, operatorsOf, pct, selectedFilials, sourceOf, totalsOf } from "../v2-metrics";

/**
 * «Analitika» (tuzilma v2 §12.3): mahsulotlar, atkaz, konversiya — filiallar bo'yicha,
 * filial ichida operatorlar bo'yicha. Taxminiy shartnoma — backend v2 hujjati kelganda almashtiriladi.
 */

/** Atkaz mahsulotlarga sotuvdan boshqacha bo'linadi: Kardiomed va Diabefit ko'proq qaytadi. */
const CANCEL_WEIGHTS: Record<number, number> = {
  11: 16,
  12: 24,
  13: 12,
  14: 9,
  15: 10,
  16: 16,
  17: 8,
  18: 5,
};

const analytics = (ctx: MockContext) => {
  const filials = selectedFilials(ctx).map((filial) => ({ filial, flow: filialFlow(ctx, filial.id) }));
  const total = totalsOf(
    filials.map((row) => row.flow),
    ["leads", "leadSold", "sold", "delivered", "cancelled"],
  );

  const productIds = PRODUCTS.map((product) => product.id);
  const sold = apportion(
    total.sold,
    productIds.map((id) => PRODUCT_WEIGHTS[id] ?? 0),
  );
  const delivered = apportion(
    total.delivered,
    productIds.map((id) => PRODUCT_WEIGHTS[id] ?? 0),
  );
  const cancelled = apportion(
    total.cancelled,
    productIds.map((id) => CANCEL_WEIGHTS[id] ?? 0),
  );

  return envelope(ctx, {
    totals: {
      leads: total.leads,
      sold: total.sold,
      delivered: total.delivered,
      cancelled: total.cancelled,
      conversion_pct: pct(total.leadSold, total.leads),
      cancel_rate_pct: pct(total.cancelled, total.sold),
    },
    trend: {
      labels: ctx.period.labels,
      sold: ctx.series(total.sold, 31),
      delivered: ctx.series(total.delivered, 33),
      otkaz: ctx.series(total.cancelled, 37),
    },
    filials: filials.map(({ filial, flow }) => ({
      id: filial.id,
      code: codeOf(filial),
      name: filial.name,
      leads: flow.leads,
      sold: flow.sold,
      delivered: flow.delivered,
      cancelled: flow.cancelled,
      conversion_pct: pct(flow.leadSold, flow.leads),
      cancel_rate_pct: pct(flow.cancelled, flow.sold),
    })),
    products: PRODUCTS.map((product, index) => {
      const productSold = sold[index] ?? 0;
      const productCancelled = cancelled[index] ?? 0;
      const productDelivered = delivered[index] ?? 0;
      return {
        id: product.id,
        name: product.name,
        sold: productSold,
        delivered: productDelivered,
        cancelled: productCancelled,
        revenue: productDelivered * product.price,
        cancel_rate_pct: pct(productCancelled, productSold),
      };
    }),
    // ilova zakazida operator yo'q — «Ilovadan» filtrida ro'yxat bo'sh
    operators: (sourceOf(ctx) === "app" ? [] : filials).flatMap(({ filial }) =>
      operatorsOf(ctx, filial.id).map((operator) => ({
        id: operator.id,
        full_name: operator.full_name,
        filial_id: filial.id,
        leads: operator.leads,
        sold: operator.sold,
        cancelled: operator.cancelled,
        conversion_pct: pct(operator.sold, operator.leads),
        cancel_rate_pct: pct(operator.cancelled, operator.sold),
      })),
    ),
  });
};

export const analyticsHandlers: MockHandler[] = [
  { method: "GET", path: "analytics/v2/", resolve: analytics },
];
