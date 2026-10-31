import { afterEach, describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { resetSklad } from "@/shared/testing/fixtures/sklad-state";
import { resetStructure } from "@/shared/testing/fixtures/structure-v2";
import { mockGet, mockSend } from "@/shared/testing/mock-api";

import { grantOwners, pageRange, skladByRegion, stockRows } from "./warehouse.rules";
import {
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
