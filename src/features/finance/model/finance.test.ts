import { describe, expect, it } from "vitest";

import { parseEnvelope } from "@/shared/lib/envelope";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import { chiefRows, feeDue, lastHandovers, regionSteps } from "./finance.rules";
import { financeSchema } from "./finance.schema";

const finance = (query: Record<string, string>) =>
  parseEnvelope(financeSchema, mockGet("finance/v2/", query)).data;

describe("finance contract", () => {
  it.each(SCOPE_CASES)("matches its schema for %o", (query) => {
    expect(() => finance(query)).not.toThrow();
  });

  it("totals are the sum of filials; money in the chain adds up to the revenue", () => {
    const data = finance({ period: "30d" });
    const sum = (key: "revenue" | "atCouriers" | "atChiefs" | "handed" | "addresses") =>
      data.filials.reduce((total, row) => total + row[key], 0);
    expect(sum("revenue")).toBe(data.totals.revenue);
    expect(sum("addresses")).toBe(data.totals.addresses);
    expect(data.totals.atCouriers + data.totals.atChiefs + data.totals.handed).toBe(data.totals.revenue);
  });

  it("pays every chief courier one common rate per delivered address, per filial", () => {
    const data = finance({ period: "30d" });
    expect(data.addressRate).toBe(25_000);
    for (const row of chiefRows(data.chiefs)) expect(row.fee).toBe(row.addresses * (data.addressRate ?? 0));
    expect(data.chiefs).toHaveLength(5);
  });

  it("has all fourteen regions for the map", () => {
    expect(finance({ period: "30d" }).regions).toHaveLength(14);
  });
});

describe("finance rules", () => {
  it("computes the fee still owed", () => {
    expect(feeDue({ chiefFee: 100, chiefFeePaid: 80 })).toBe(20);
    expect(feeDue({ chiefFee: 100, chiefFeePaid: 120 })).toBe(0);
  });

  it("steps region money on a six-step scale and leaves empty regions blank", () => {
    const steps = regionSteps([
      { code: "a", sold: 0, delivered: 0, cancelled: 0, money: 0 },
      { code: "b", sold: 1, delivered: 1, cancelled: 0, money: 100 },
      { code: "c", sold: 1, delivered: 1, cancelled: 0, money: 10 },
    ]);
    expect(steps.get("a")).toBeNull();
    expect(steps.get("b")).toBe(5);
    expect(steps.get("c")).toBe(0);
  });

  it("keeps the last handover of each chief courier and filial, disputed and pending first", () => {
    const rows = lastHandovers(finance({ period: "30d" }).handovers);
    expect(rows).toHaveLength(15);
    expect(rows[0]).toMatchObject({ chiefName: "Farhod Normatov", filialCode: "T2", status: "disputed" });
    expect(rows.at(-1)?.status).not.toBe("disputed");
  });

  it("flags a chief courier who holds back a large share of a filial's money", () => {
    const data = finance({ period: "30d" });
    const late = chiefRows(data.chiefs).filter((row) => row.pendingPct > 20);
    expect(late.map((row) => `${row.skladName}-${row.filialCode}`)).toEqual(["Janub-T2"]);
  });
});

describe("finance v2 answer (B-18 / N-7)", () => {
  const live = (data: Record<string, unknown>) =>
    parseEnvelope(financeSchema, {
      period: { from: "2026-10-02", to: "2026-10-31", granularity: "day", label: "30d" },
      compare: null,
      filials: [],
      generated_at: "2026-10-31T00:00:00Z",
      freshness: {},
      data,
    }).data;

  it("reads address_rate, the untracked fee and handover statuses", () => {
    const data = live({
      totals: { revenue: "1000", with_couriers: "100", with_chiefs: "0", handed_over: "900" },
      by_filial: [{ filial: { id: 2, name: "Mehrigiyo Qo'qon" }, revenue: "1000" }],
      address_rate: 10000,
      fee_paid: null,
      fee_paid_tracked: false,
      chiefs: [
        {
          seat_id: 61,
          full_name: "Bosh kuryer",
          by_filial: [{ filial: { id: 2, name: "Mehrigiyo Qo'qon" }, addresses: 3, fee: "30000" }],
        },
      ],
      handovers: [
        {
          id: 4,
          date: "2026-10-31",
          amount: "25000",
          expected_amount: "0",
          confirmed_amount: null,
          status: "disputed",
          chief: { seat_id: 61, full_name: "Bosh kuryer" },
          filial: { id: 2, name: "Mehrigiyo Qo'qon" },
        },
        { id: 5, date: "2026-10-30", amount: "1", status: "lost", chief: null, filial: { id: 2, name: "Q" } },
      ],
    });
    expect(data.addressRate).toBe(10_000);
    expect(data.feePaidTracked).toBe(false);
    expect(data.totals.addresses).toBe(3);
    expect(data.filials[0]).toMatchObject({ id: 2, addresses: 3, chiefFee: 30_000, chiefFeePaid: null });
    expect(data.handovers.map((row) => row.status)).toEqual(["disputed", "pending"]);
    expect(data.handovers[0]).toMatchObject({ skladId: 61, chiefName: "Bosh kuryer", amount: 25_000 });
  });

  it("leaves the rate empty and the fee untracked when the fields are missing", () => {
    const data = live({ totals: {}, by_filial: [] });
    expect(data.addressRate).toBeNull();
    expect(data.feePaidTracked).toBe(false);
    expect(data.handovers).toEqual([]);
  });

  it("never shows a negative balance at chief couriers", () => {
    expect(live({ totals: { with_chiefs: "-44000" } }).totals.atChiefs).toBe(0);
  });
});
