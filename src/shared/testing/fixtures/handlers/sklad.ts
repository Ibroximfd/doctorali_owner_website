import type { RegionCode } from "@/shared/config/regions";

import type { MockContext } from "../engine";
import { cellOf, locations, skladState, type LedgerRow } from "../sklad-state";
import { PRODUCTS, REGION_NAMES } from "../structure-v2";
import { mockResponse, type MockHandler } from "../types";

/**
 * Sklad API (`/api/sklad/*`) — TZ 18 §3–§6 va v2 §4.6 shaklida; Owner faqat o'qiydi, shuning
 * uchun yozuv handlerlari yo'q. Namuna bazada `sklad-api/` prefiksi ostida (BFF va MSW
 * `/api/sklad/X` ni `sklad-api/X` ga aylantiradi).
 */
const P = "sklad-api/";

const fail = (status: number, code: string, detail: string, extra: Record<string, unknown> = {}) =>
  mockResponse(status, { code, detail, ...extra });

const items = () =>
  PRODUCTS.map((product) => ({
    id: product.id,
    name: product.name,
    sku: `MG-${product.id}`,
    barcode: `47800${product.id}`,
    package_size: 12,
    package_label: "karobka",
    unit_label: "dona",
    price: `${product.price}.00`,
    is_active: true,
    image: null,
  }));

const sklads = (ctx: MockContext) =>
  skladState(ctx.now).sklads.map((sklad) => ({
    ...sklad,
    regions: [...sklad.regions],
    chief: { ...sklad.chief },
    locations: sklad.regions.length,
  }));

const locationRef = (id: number) => {
  const location = locations().find((item) => item.id === id);
  return location
    ? { id: location.id, name: location.name, kind: location.kind, region: location.region }
    : null;
};

const stockRows = () =>
  locations().flatMap((location) =>
    PRODUCTS.map((product) => {
      const cell = cellOf(location.id, product.id);
      return {
        location: locationRef(location.id),
        item: { id: product.id, name: product.name, sku: `MG-${product.id}`, package_size: 12 },
        on_hand: cell.on_hand,
        min_quantity: cell.min,
        is_low: location.kind === "region" && cell.on_hand < cell.min,
        sold_7d: 0,
        days_left: null,
        updated_at: "2026-10-31T09:00:00+05:00",
      };
    }),
  );

const stock = (ctx: MockContext) => {
  skladState(ctx.now);
  const locationId = Number(ctx.searchParams.get("location"));
  const itemId = Number(ctx.searchParams.get("item"));
  return stockRows().filter(
    (row) => (!locationId || row.location?.id === locationId) && (!itemId || row.item.id === itemId),
  );
};

const overview = (ctx: MockContext) => {
  skladState(ctx.now);
  const rows = stockRows();
  const regions = (Object.keys(REGION_NAMES) as RegionCode[]).map((code) => {
    const own = rows.filter((row) => row.location?.region === code);
    const regional = own.filter((row) => row.location?.kind === "region");
    const lowItems = regional.filter((row) => row.is_low).length;
    return {
      code,
      name: REGION_NAMES[code],
      on_hand: regional.reduce((sum, row) => sum + row.on_hand, 0),
      with_couriers: own
        .filter((row) => row.location?.kind === "courier")
        .reduce((sum, row) => sum + row.on_hand, 0),
      couriers: own.some((row) => row.location?.kind === "courier") ? 1 : 0,
      locations: 1,
      low_items: lowItems,
      delivered_today: 0,
      status: lowItems > 0 ? "low" : "ok",
    };
  });
  return {
    as_of: ctx.now.toISOString(),
    totals: {
      on_hand: regions.reduce((sum, row) => sum + row.on_hand, 0),
      locations: locations().filter((location) => location.kind === "region").length,
      with_couriers: regions.reduce((sum, row) => sum + row.with_couriers, 0),
      couriers: locations().filter((location) => location.kind === "courier").length,
      low_items: regions.reduce((sum, row) => sum + row.low_items, 0),
      low_regions: regions.filter((row) => row.low_items > 0).length,
      delivered_today: 0,
      sold_today_qty: 0,
      receipt_today_qty: 0,
      receipt_today_docs: 0,
    },
    regions,
  };
};

const ledgerMatches = (ctx: MockContext) => {
  const query = ctx.searchParams;
  const region = query.get("region");
  const item = Number(query.get("item"));
  const types = (query.get("movement_type") ?? "").split(",").filter(Boolean);
  const from = query.get("date_from");
  const to = query.get("date_to");
  // vergul bilan bir nechta (B-23)
  const actorKinds = (query.get("actor_kind") ?? "").split(",").filter(Boolean);
  const skladId = Number(query.get("sklad"));
  const skladRegions = skladId
    ? (skladState(ctx.now).sklads.find((sklad) => sklad.id === skladId)?.regions ?? [])
    : null;
  return (row: LedgerRow) => {
    const date = row.created_at.slice(0, 10);
    return (
      (!region || row.region === region) &&
      (skladRegions === null || skladRegions.some((code) => code === row.region)) &&
      (actorKinds.length === 0 || actorKinds.includes(row.actor.kind)) &&
      (!item || row.item.id === item) &&
      (types.length === 0 || types.includes(row.movement_type)) &&
      (!from || date >= from) &&
      (!to || date <= to)
    );
  };
};

/** `{count, next, previous, results}` (TZ 18 §2), eng yangisi tepada. */
const ledger = (ctx: MockContext) => {
  const rows = skladState(ctx.now)
    .ledger.filter(ledgerMatches(ctx))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  const pageSize = Math.min(100, Math.max(1, Number(ctx.searchParams.get("page_size")) || 50));
  const page = Math.max(1, Number(ctx.searchParams.get("page")) || 1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  return {
    count: rows.length,
    next: page < pages ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: rows.slice((page - 1) * pageSize, page * pageSize).map((row) => structuredClone(row)),
  };
};

/** `GET ledger/summary/` (TZ 18 §6.3) — tur bo'yicha yig'indi. */
const ledgerSummary = (ctx: MockContext) => {
  const rows = skladState(ctx.now).ledger.filter(ledgerMatches(ctx));
  const sum = (type: string, kind?: "region" | "courier") =>
    rows
      .filter((row) => row.movement_type === type && (!kind || row.location.kind === kind))
      .reduce((total, row) => total + row.quantity, 0);
  return {
    sale: sum("sale"),
    gift: 0,
    sale_points: 0,
    courier_load: sum("courier_load", "region"),
    courier_return: sum("courier_return", "region"),
    receipt: sum("receipt"),
    write_off: sum("write_off"),
    adjustment: sum("adjustment"),
    orders_delivered: rows.filter((row) => row.movement_type === "sale").length,
    receipt_docs: new Set(rows.filter((row) => row.movement_type === "receipt").map((row) => row.source.id))
      .size,
  };
};

const documentDetail = (ctx: MockContext) => {
  const document = skladState(ctx.now).documents.get(Number(ctx.params.id));
  return document ? structuredClone(document) : fail(404, "not_found", "Hujjat topilmadi");
};

export const skladHandlers: MockHandler[] = [
  { method: "GET", path: `${P}items/`, resolve: items },
  { method: "GET", path: `${P}sklads/`, resolve: sklads },
  { method: "GET", path: `${P}overview/`, resolve: overview },
  { method: "GET", path: `${P}stock/`, resolve: stock },
  { method: "GET", path: `${P}ledger/`, resolve: ledger },
  { method: "GET", path: `${P}ledger/summary/`, resolve: ledgerSummary },
  { method: "GET", path: `${P}documents/:id/`, resolve: documentDetail },
];
