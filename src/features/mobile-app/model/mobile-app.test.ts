import { describe, expect, it } from "vitest";

import { parseFlexible } from "@/shared/lib/lenient";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import { operatorRows, orderedRate } from "./mobile-app.rules";
import { appV2Schema } from "./mobile-app.schema";

const appV2 = (query: Record<string, string>) => parseFlexible(appV2Schema, mockGet("app/v2/", query)).data;

describe("app contract", () => {
  it.each(SCOPE_CASES)("orders, users and operators match their schemas for %o", (query) => {
    const data = appV2(query);
    expect(data.orders).not.toBeNull();
    expect(data.users).not.toBeNull();
    expect(data.operators).not.toBeNull();
  });

  it("reads a bare body and leaves a missing section as null", () => {
    const data = parseFlexible(appV2Schema, { audience: { total: "120", dau: 10, mau: 40 } }).data;
    expect(data.users?.usersTotal).toBe(120);
    expect(data.orders).toBeNull();
    expect(data.operators).toBeNull();
  });

  it("statuses add up to the orders received, filials add up to the total", () => {
    const data = appV2({ period: "30d" }).orders;
    if (!data) throw new Error("orders missing");
    const { pending, confirmed, inTransit, delivered, cancelled } = data.statuses;
    expect(pending + confirmed + inTransit + delivered + cancelled).toBe(data.total);
    expect(data.filials.reduce((sum, row) => sum + row.total, 0)).toBe(data.total);
  });

  it("MAU is above DAU and total users above MAU", () => {
    const users = appV2({ period: "30d" }).users;
    if (!users) throw new Error("users missing");
    expect(users.mau).toBeGreaterThan(users.dau);
    expect(users.usersTotal).toBeGreaterThan(users.mau);
    expect(users.trend.dau).toHaveLength(users.trend.labels.length);
  });
});

describe("app rules", () => {
  const rows = [
    { id: 1, fullName: "B", filialId: 1, filialCode: "Q", filialName: "Q", invited: 10, ordered: 5 },
    { id: 2, fullName: "A", filialId: 2, filialCode: "T1", filialName: "T1", invited: 20, ordered: 4 },
    { id: 3, fullName: "C", filialId: 1, filialCode: "Q", filialName: "Q", invited: 0, ordered: 0 },
  ];

  it("filters by filial and sorts by any column", () => {
    expect(operatorRows(rows, null, "invited").map((row) => row.id)).toEqual([2, 1, 3]);
    expect(operatorRows(rows, null, "rate").map((row) => row.id)).toEqual([1, 2, 3]);
    expect(operatorRows(rows, null, "name").map((row) => row.fullName)).toEqual(["A", "B", "C"]);
    expect(operatorRows(rows, 1, "ordered").map((row) => row.id)).toEqual([1, 3]);
  });

  it("computes the share who ordered", () => {
    expect(orderedRate({ invited: 10, ordered: 5 })).toBe(50);
    expect(orderedRate({ invited: 0, ordered: 0 })).toBeNull();
  });
});
