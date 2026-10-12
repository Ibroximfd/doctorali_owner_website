import { envelope, sparkline, type MockContext } from "../engine";
import { sample } from "../sample";
import type { MockHandler } from "../types";

const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

const sumOf = <Item>(items: readonly Item[], pick: (item: Item) => number): number =>
  items.reduce((sum, item) => sum + pick(item), 0);

/**
 * Mahsulot tushumi = yetkazib berish tushumi + klinika do'koni sotuvi
 * (`sample.categories` yig'indisi shunga teng). Yig'ma raqamlar qatorlardan
 * hisoblanadi — KPI, jadval va toifalar bir-biriga zid kelmaydi.
 */
const products = (ctx: MockContext) => {
  const categories = sample.categories.map((category) => ({
    name: category.name,
    revenue: ctx.flow(category.revenue),
  }));
  const revenueTotal = sumOf(categories, (category) => category.revenue);

  const results = sample.products.map((product) => {
    const deliveryUnits = ctx.flow(product.deliveryUnits);
    const clinicUnits = ctx.flow(product.clinicUnits);
    const revenue = ctx.flow(product.revenue);

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      units: deliveryUnits + clinicUnits,
      revenue,
      share_pct: pct(revenue, revenueTotal),
      delivery_units: deliveryUnits,
      clinic_units: clinicUnits,
      gift_units: ctx.flow(product.giftUnits),
      // qoldiq — hozirgi holat; tugamagan mahsulot filial bo'yicha masshtablanganda 0 ga tushmasin
      stock_quantity: product.isOut ? 0 : Math.max(1, ctx.stock(product.stock)),
      is_low: product.isLow,
      trend: sparkline(200 + product.id),
    };
  });

  return envelope(ctx, {
    results,
    categories: categories.map((category) => ({
      ...category,
      share_pct: pct(category.revenue, revenueTotal),
    })),
    summary: {
      units: ctx.metric(
        sumOf(results, (row) => row.units),
        7.2,
        "count",
      ),
      revenue: ctx.metric(revenueTotal, 9.4, "uzs"),
      gift_units: ctx.metric(
        sumOf(results, (row) => row.gift_units),
        14.0,
        "count",
      ),
      gift_cost: ctx.flow(sample.liabilities.giftsCost),
      stock_out: results.filter((row) => row.stock_quantity === 0).length,
      stock_low: results.filter((row) => row.is_low).length,
    },
    sparklines: { units: sparkline(141), revenue: sparkline(142) },
  });
};

/** `products` bo'limi namunalari (`02_BACKEND_TZ` §4.9). */
export const productsHandlers: MockHandler[] = [{ method: "GET", path: "products/", resolve: products }];
