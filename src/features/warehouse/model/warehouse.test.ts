import { afterEach, describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { resetSklad } from "@/shared/testing/fixtures/sklad-state";
import { resetStructure } from "@/shared/testing/fixtures/structure-v2";
import { mockGet, mockSend } from "@/shared/testing/mock-api";

import { grantOwners, lowCount, pageRange, skladByRegion, skladSummary, stockRows } from "./warehouse.rules";
import {
  ACTOR_KINDS,
  actorKindParam,
  documentSchema,
  grantsSchema,
  ledgerSchema,
  ledgerSummarySchema,
  overviewSchema,
  skladsSchema,
  stockSchema,
} from "./warehouse.schema";

const S = "sklad-api/";
const sklads = () => parseJson(skladsSchema, mockGet(`${S}sklads/`));
const stock = () => parseJson(stockSchema, mockGet(`${S}stock/`, { pagination: "false" }));
const ledger = (query: Record<string, string> = {}) => parseJson(ledgerSchema, mockGet(`${S}ledger/`, query));
const onHand = (locationId: number, itemId: number) =>
  stock().find((cell) => cell.location.id === locationId && cell.item.id === itemId)?.onHand ?? 0;
const reset = () => {
  resetStructure();
  resetSklad();
};

describe("sklad API contract (TZ 18, v2 §2.10)", () => {
  afterEach(reset);

  it("sklads, overview, stock, ledger and documents match their schemas", () => {
    expect(() => {
      parseJson(overviewSchema, mockGet(`${S}overview/`));
      parseJson(ledgerSummarySchema, mockGet(`${S}ledger/summary/`));
    }).not.toThrow();
    expect(ledger().count).toBeGreaterThan(50);
    const receipt = ledger({ movement_type: "receipt" }).results[0];
    const document = parseJson(documentSchema, mockGet(`${S}documents/${receipt?.source?.id ?? 0}/`));
    expect(document.number).toMatch(/^KIR-/);
  });

  it("offers the owner no way to write into the sklad", () => {
    expect(mockSend("POST", `${S}documents/`, { type: "receipt" }).status).toBe(404);
    expect(mockSend("PATCH", `${S}sklads/1/`, { regions: ["fargona"] }).status).toBe(404);
  });

  it("has five sklads (one per chief courier) covering fourteen regions without overlap", () => {
    expect(sklads().map((sklad) => sklad.name)).toEqual([
      "Vodiy sklad",
      "Toshkent sklad",
      "Markaz sklad",
      "Janub sklad",
      "G'arb sklad",
    ]);
    expect(skladByRegion(sklads()).size).toBe(14);
  });

  it("filters the ledger by any date range, region and item and pages through it", () => {
    const day = ledger({ date_from: "2026-09-25", date_to: "2026-09-25", region: "toshkent_shahar" });
    expect(
      day.results.every((row) => row.createdAt.startsWith("2026-09-25") && row.region === "toshkent_shahar"),
    ).toBe(true);
    const page2 = ledger({ page: "2", page_size: "20" });
    expect(page2.previous).not.toBeNull();
    expect(ledger({ item: "12" }).results.every((row) => row.item.id === 12)).toBe(true);
  });

  it("latest ledger balance equals the stock on screen", () => {
    const [latest] = ledger({ region: "toshkent_shahar", item: "11", page_size: "100" }).results.filter(
      (row) => row.location.id === 100,
    );
    expect(latest?.balanceAfter).toBe(onHand(100, 11));
  });
});

describe("warehouse rules", () => {
  afterEach(reset);

  it("sums stock per item for a sklad: stores on hand, couriers apart, low flagged", () => {
    const janub = sklads().find((sklad) => sklad.name === "Janub sklad");
    const rows = stockRows(stock(), janub?.regions ?? []);
    const kardiomed = rows.find((row) => row.name === "Kardiomed");
    expect(kardiomed).toMatchObject({ qty: 24, isLow: true });
    expect(rows[0]?.isLow).toBe(true);
    expect(stockRows(stock(), null).reduce((sum, row) => sum + row.qty, 0)).toBe(
      parseJson(overviewSchema, mockGet(`${S}overview/`)).totals.onHand,
    );
  });

  it("maps products to the filial they are granted to", () => {
    const grants = [1, 2, 3].map((id) => parseJson(grantsSchema, mockGet(`structure/sklad-grants/${id}/`)));
    const owners = grantOwners(grants);
    expect(owners.get(11)).toBe(1);
    expect(owners.get(15)).toBe(2);
    expect(owners.has(18)).toBe(false);
  });

  it("computes the page range", () => {
    expect(pageRange(2, 20, 45)).toEqual({ from: 21, to: 40, pages: 3 });
    expect(pageRange(1, 20, 0)).toEqual({ from: 0, to: 0, pages: 1 });
  });
});

describe("stock low flag (merged sklad)", () => {
  const cell = (region: string, onHand: number, minQuantity: number, isLow: boolean) => ({
    location: { id: region.length, name: region, kind: "region", region },
    item: { id: 1, name: "Paratsetamol", image: null },
    onHand,
    minQuantity,
    isLow,
  });

  it("is low only when the summed stock is below the largest minimum — row is_low is ignored", () => {
    // sklad birlashtirilgan: bitta ombor to'la, bo'sh viloyat omborlari `is_low: true`
    const merged = [
      cell("namangan", 8704, 700, false),
      cell("andijon", 0, 700, true),
      cell("fargona", 0, 700, true),
    ];
    expect(stockRows(merged, null)[0]).toMatchObject({ qty: 8704, minQty: 700, isLow: false });
    expect(stockRows([cell("namangan", 500, 700, false)], null)[0]?.isLow).toBe(true);
    expect(stockRows([cell("namangan", 0, 0, true)], null)[0]?.isLow).toBe(false);
  });
});

describe("ledger summary", () => {
  it("keeps numeric entries only — strings become numbers, objects and nulls are dropped", () => {
    expect(
      ledgerSummarySchema.parse({ sale: "-790", receipt: 2400, period: { from: "x" }, gift: null }),
    ).toEqual({ sale: -790, receipt: 2400 });
    expect(ledgerSummarySchema.parse(null)).toEqual({});
  });
});

describe("sklad v2 answers (B-23, item.image)", () => {
  const row = {
    location: { id: 3, name: "Andijon ombori", kind: "region", region: "andijon" },
    item: { id: 14, name: "Alatoo bals", image: "https://imorganic.uz/media/items/a.webp" },
    on_hand: 5,
    min_quantity: 50,
    is_low: true,
  };

  it("reads stock as a plain array (pagination=false) or a single page, with the item image", () => {
    expect(stockSchema.parse([row])[0]?.item.image).toBe("https://imorganic.uz/media/items/a.webp");
    expect(stockSchema.parse({ count: 1, next: null, results: [row] })).toHaveLength(1);
    const noImage = stockSchema.parse([{ ...row, item: { id: 14, name: "Alatoo bals", image: null } }]);
    expect(noImage[0]?.item.image).toBeNull();
    expect(stockSchema.parse([{ ...row, item: { id: 14, name: "Alatoo bals" } }])[0]?.item.image).toBeNull();
  });

  it("keeps the first image on the stock row", () => {
    const cells = parseJson(stockSchema, [row, { ...row, item: { ...row.item, image: null } }]);
    expect(stockRows(cells, null)[0]?.image).toBe("https://imorganic.uz/media/items/a.webp");
  });

  it("filters ledger by the three known actor kinds only", () => {
    expect(ACTOR_KINDS).toEqual(["logist", "courier", "system"]);
    expect(actorKindParam("courier,logist")).toBe("logist,courier");
    expect(actorKindParam("chief_courier,system,system")).toBe("system");
    expect(actorKindParam("chief_courier")).toBeNull();
    expect(actorKindParam(null)).toBeNull();
  });

  it("counts low items with the same rule as the stock table (card = list)", () => {
    const cells = parseJson(stockSchema, [
      { ...row, on_hand: 8000, min_quantity: 50, is_low: false },
      { ...row, location: { ...row.location, id: 4, region: "fargona" }, on_hand: 0, is_low: true },
      {
        ...row,
        location: { id: 9, name: "Kuryer", kind: "courier", region: "andijon" },
        on_hand: 0,
        is_low: true,
      },
    ]);
    const rows = stockRows(cells, null);
    expect(rows[0]?.isLow).toBe(false);
    expect(lowCount(rows)).toBe(0);
    expect(skladSummary({ regions: ["fargona"] }, undefined, cells).lowItems).toBe(1);
    expect(skladSummary({ regions: ["andijon"] }, undefined, undefined).lowItems).toBeNull();
  });
});
