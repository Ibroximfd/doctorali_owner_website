import { addDays } from "@/shared/lib/scope";

import { envelope, type MockContext } from "../engine";
import type { MockHandler } from "../types";

/** Namuna omborlar: uchtasi filialniki, bittasi marketplace (ERP) dan — u faqat "hamma filiallar" da ko'rinadi. */
const WAREHOUSES = [
  {
    id: 1,
    name: "Toshkent markaziy",
    filialId: 1,
    source: "doctor_ali",
    regions: ["toshkent_shahar", "toshkent"],
    keeper: { id: 31, full_name: "Sardor Aliyev", phone: "+998901234567" },
  },
  {
    id: 2,
    name: "Qo'qon",
    filialId: 2,
    source: "doctor_ali",
    regions: ["fargona", "andijon", "namangan"],
    keeper: { id: 32, full_name: "Dilshod Qodirov", phone: "+998911112233" },
  },
  { id: 3, name: "Samarqand", filialId: 3, source: "doctor_ali", regions: ["samarqand"], keeper: null },
  {
    id: 4,
    name: "Marketplace Andijon",
    filialId: null,
    source: "marketplace",
    regions: ["andijon"],
    keeper: { id: 41, full_name: "Ulug'bek Sobirov", phone: null },
  },
] as const;

const PRODUCTS = [
  { id: 7, name: "Mehrigiyo balzami", sku: "MB-500", price: 1_370_000 },
  { id: 8, name: "Shifobaxsh choy", sku: "SC-120", price: 185_000 },
  { id: 9, name: "Asal-propolis", sku: "AP-250", price: 240_000 },
  { id: 10, name: "Bo'g'im kremi", sku: "BK-75", price: 310_000 },
] as const;

/** [ombor][mahsulot] → [qoldiq, kunlik chiqim, min]. */
const STOCK: Record<number, readonly (readonly [number, number, number | null])[]> = {
  1: [
    [84, 31.5, 100],
    [1420, 38, 300],
    [620, 21, 200],
    [310, 9.5, null],
  ],
  2: [
    [260, 12, 80],
    [540, 14, 150],
    [0, 6, 50],
    [190, 4, null],
  ],
  3: [
    [140, 7.5, 60],
    [260, 11, 100],
    [95, 4.2, 40],
    [45, 2.5, null],
  ],
  4: [
    [380, 9, null],
    [0, 0, null],
    [120, 3, null],
    [60, 1.2, null],
  ],
};

const round1 = (value: number): number => Math.round(value * 10) / 10;

const statusOf = (qty: number, avgOut: number, minQty: number | null): string => {
  if (qty <= 0) return avgOut > 0 ? "out" : "empty";
  const cover = avgOut > 0 ? qty / avgOut : null;
  if ((minQty !== null && qty < minQty) || (cover !== null && cover < 3)) return "critical";
  if (cover !== null && cover < 7) return "low";
  return "ok";
};

const STATUS_RANK = ["out", "critical", "low", "ok", "empty"];

const scopedWarehouses = (ctx: MockContext) =>
  WAREHOUSES.filter((warehouse) =>
    warehouse.filialId === null
      ? ctx.isAllFilials
      : ctx.filials.some((filial) => filial.id === warehouse.filialId),
  );

const stockRows = (ctx: MockContext) =>
  scopedWarehouses(ctx).flatMap((warehouse) =>
    PRODUCTS.map((product, index) => {
      const [qty, avgOut, minQty] = STOCK[warehouse.id]?.[index] ?? [0, 0, null];
      const cover = avgOut > 0 ? round1(qty / avgOut) : null;
      return {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        warehouse_id: warehouse.id,
        warehouse_name: warehouse.name,
        qty,
        value: qty * product.price,
        min_qty: minQty,
        avg_daily_out: avgOut,
        days_of_cover: cover,
        stockout_date: cover === null ? null : addDays(ctx.today, Math.floor(cover)),
        status: statusOf(qty, avgOut, minQty),
      };
    }),
  );

type StockRowDto = ReturnType<typeof stockRows>[number];

const sum = (rows: readonly StockRowDto[], pick: (row: StockRowDto) => number): number =>
  rows.reduce((total, row) => total + pick(row), 0);

/** Davrdagi chiqim — kunlik o'rtachadan; kirim chiqimdan biroz ko'p (qoldiq to'ldirilmoqda). */
const outboundOf = (ctx: MockContext, rows: readonly StockRowDto[]) =>
  Math.round(sum(rows, (row) => row.avg_daily_out) * 30 * ctx.period.scale);
const inboundOf = (ctx: MockContext, rows: readonly StockRowDto[]) =>
  Math.round(outboundOf(ctx, rows) * 1.06);

const worstStatus = (rows: readonly StockRowDto[]): string => {
  if (rows.every((row) => row.status === "empty")) return "empty";
  return (
    rows.map((row) => row.status).sort((a, b) => STATUS_RANK.indexOf(a) - STATUS_RANK.indexOf(b))[0] ?? "ok"
  );
};

const coverOf = (rows: readonly StockRowDto[]): number | null => {
  const out = sum(rows, (row) => row.avg_daily_out);
  return out > 0 ? round1(sum(rows, (row) => row.qty) / out) : null;
};

const warehouseRows = (ctx: MockContext) => {
  const rows = stockRows(ctx);
  return scopedWarehouses(ctx).map((warehouse) => {
    const own = rows.filter((row) => row.warehouse_id === warehouse.id);
    return {
      id: warehouse.id,
      name: warehouse.name,
      source: warehouse.source,
      regions: [...warehouse.regions],
      keeper: warehouse.keeper,
      stock_units: sum(own, (row) => row.qty),
      stock_value: sum(own, (row) => row.value),
      inbound: inboundOf(ctx, own),
      outbound: outboundOf(ctx, own),
      low_skus: own.filter((row) => row.status === "low").length,
      out_skus: own.filter((row) => row.status === "out" || row.status === "critical").length,
      days_of_cover: coverOf(own),
      status: worstStatus(own),
      last_movement_at: new Date(ctx.now.getTime() - warehouse.id * 3_600_000).toISOString(),
    };
  });
};

const summary = (ctx: MockContext) => {
  const rows = stockRows(ctx);
  const warehouses = warehouseRows(ctx);
  return envelope(ctx, {
    stock_units: warehouses.reduce((total, row) => total + row.stock_units, 0),
    stock_value: warehouses.reduce((total, row) => total + row.stock_value, 0),
    sku_count: new Set(rows.filter((row) => row.qty > 0).map((row) => row.product_id)).size,
    low_skus: warehouses.reduce((total, row) => total + row.low_skus, 0),
    out_skus: warehouses.reduce((total, row) => total + row.out_skus, 0),
    days_of_cover: coverOf(rows),
    inbound: ctx.metric(
      warehouses.reduce((total, row) => total + row.inbound, 0),
      14.8,
      "count",
    ),
    outbound: ctx.metric(
      warehouses.reduce((total, row) => total + row.outbound, 0),
      9.6,
      "count",
    ),
    snapshot_at: `${addDays(ctx.today, -1)}T23:00:00+05:00`,
  });
};

const stock = (ctx: MockContext) => {
  const id = Number(ctx.searchParams.get("warehouse"));
  const rows = stockRows(ctx)
    .filter((row) => !id || row.warehouse_id === id)
    .sort(
      (a, b) =>
        STATUS_RANK.indexOf(a.status) - STATUS_RANK.indexOf(b.status) ||
        (a.days_of_cover ?? Infinity) - (b.days_of_cover ?? Infinity),
    );
  return envelope(ctx, rows);
};

const movements = (ctx: MockContext) => {
  const warehouses = warehouseRows(ctx);
  return envelope(ctx, {
    labels: ctx.period.labels,
    series: [
      {
        key: "inbound",
        values: ctx.series(
          warehouses.reduce((total, row) => total + row.inbound, 0),
          301,
        ),
      },
      {
        key: "outbound",
        values: ctx.series(
          warehouses.reduce((total, row) => total + row.outbound, 0),
          302,
        ),
      },
    ],
  });
};

/** Chiqim tarkibi: har mahsulot chiqimi (davr) to'liq / chegirma / sovg'a ulushlariga bo'linadi. */
const MIX_SHARE = [0.68, 0.22, 0.1] as const;

const salesMix = (ctx: MockContext) => {
  const rows = stockRows(ctx);
  const products = PRODUCTS.map((product) => {
    const out = Math.round(
      rows.filter((row) => row.product_id === product.id).reduce((sum, row) => sum + row.avg_daily_out, 0) *
        30 *
        ctx.period.scale,
    );
    const full = Math.round(out * MIX_SHARE[0]);
    const gift = Math.round(out * MIX_SHARE[2]);
    const discount = out - full - gift;
    const discountPrice = Math.round(product.price * 0.87);
    return {
      product_id: product.id,
      name: product.name,
      full_units: full,
      discount_units: discount,
      gift_units: gift,
      full_revenue: full * product.price,
      discount_revenue: discount * discountPrice,
      discount_amount: discount * (product.price - discountPrice),
      gift_value: gift * product.price,
      avg_discount_pct: discount > 0 ? 13 : null,
    };
  });
  const sumOf = (pick: (row: (typeof products)[number]) => number) =>
    products.reduce((sum, row) => sum + pick(row), 0);
  const discountUnits = sumOf((row) => row.discount_units);
  const giftUnits = sumOf((row) => row.gift_units);
  const operatorDiscount = Math.round(discountUnits * 0.6);
  const promo = Math.round(giftUnits * 0.7);
  return envelope(ctx, {
    totals: {
      full_units: sumOf((row) => row.full_units),
      discount_units: discountUnits,
      gift_units: giftUnits,
      full_revenue: sumOf((row) => row.full_revenue),
      discount_revenue: sumOf((row) => row.discount_revenue),
      discount_amount: sumOf((row) => row.discount_amount),
      gift_value: sumOf((row) => row.gift_value),
      gift_cost: Math.round(sumOf((row) => row.gift_value) * 0.26),
      avg_discount_pct: discountUnits > 0 ? 13 : null,
    },
    products,
    reasons: [
      {
        kind: "discount",
        reason: "operator_discount",
        units: operatorDiscount,
        amount: Math.round(sumOf((row) => row.discount_amount) * 0.6),
      },
      {
        kind: "discount",
        reason: "loyalty_points",
        units: discountUnits - operatorDiscount,
        amount: Math.round(sumOf((row) => row.discount_amount) * 0.4),
      },
      {
        kind: "gift",
        reason: "promo_2plus1",
        units: promo,
        amount: Math.round(sumOf((row) => row.gift_value) * 0.7),
      },
      {
        kind: "gift",
        reason: "compensation",
        units: giftUnits - promo,
        amount: Math.round(sumOf((row) => row.gift_value) * 0.3),
      },
    ],
  });
};

export const warehouseHandlers: MockHandler[] = [
  { method: "GET", path: "warehouse/sales-mix/", resolve: salesMix },
  { method: "GET", path: "warehouse/summary/", resolve: summary },
  { method: "GET", path: "warehouse/warehouses/", resolve: (ctx) => envelope(ctx, warehouseRows(ctx)) },
  { method: "GET", path: "warehouse/stock/", resolve: stock },
  { method: "GET", path: "warehouse/movements/", resolve: movements },
];
