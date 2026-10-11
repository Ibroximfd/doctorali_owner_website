import { describe, expect, it } from "vitest";

import { listMockHandlers, resolveMock } from "@/shared/mocks/registry";

import { checkAll, checkEndpoint, type FetchJson } from "./check";
import { CONTRACT_ENDPOINTS, SCOPE_MATRIX } from "./endpoints";

const mockFetcher: FetchJson = async (path, query) =>
  resolveMock({
    method: "GET",
    path,
    searchParams: new URLSearchParams(query),
    now: new Date("2026-10-05T09:00:00Z"),
  });

describe("backend contract registry", () => {
  it("lists every GET endpoint the sample backend answers — nothing is left out of the handoff", () => {
    const listed = new Set(CONTRACT_ENDPOINTS.map((endpoint) => endpoint.path));
    const answered = listMockHandlers()
      .filter((handler) => handler.method === "GET")
      .map((handler) => handler.path);

    expect(answered.filter((path) => !listed.has(path))).toEqual([]);
    expect([...listed].filter((path) => !answered.includes(path))).toEqual([]);
  });

  // Har bo'lim testi filtrlarning barcha holatlarini o'zi tekshiradi; bu yerda — chekka uchtasi.
  const EDGE_SCOPES = [SCOPE_MATRIX[0], SCOPE_MATRIX[7], SCOPE_MATRIX[9]].filter(
    (scope) => scope !== undefined,
  );

  it("the sample backend passes the whole contract, including custom range and several filials", async () => {
    const results = await checkAll(mockFetcher, EDGE_SCOPES);
    const failed = results.filter((result) => result.outcome !== "ok");

    expect(failed).toEqual([]);
    expect(results.length).toBeGreaterThan(CONTRACT_ENDPOINTS.length * 2);
  });

  it("names the exact field that does not match", async () => {
    const endpoint = CONTRACT_ENDPOINTS.find((item) => item.path === "sales/filials/");
    if (!endpoint) throw new Error("sales/filials/ yo'q");
    const broken: FetchJson = async (path, query) => {
      const response = await mockFetcher(path, query);
      const json = response.json as { data: Record<string, unknown>[] };
      return {
        status: 200,
        json: { ...json, data: json.data.map((row) => ({ ...row, sales_per_operator: "122 mln" })) },
      };
    };

    const [result] = await checkEndpoint(endpoint, broken);

    expect(result?.outcome).toBe("schema");
    expect(result?.problems[0]).toMatch(/^data\.0\.sales_per_operator — Expected number, received string$/);
  });

  it("reports HTTP errors and skips id-based checks when there is no id", async () => {
    const endpoint = CONTRACT_ENDPOINTS.find((item) => item.path === "orders/:id/");
    if (!endpoint) throw new Error("orders/:id/ yo'q");

    const [down] = await checkEndpoint(endpoint, async () => ({
      status: 500,
      json: { code: "server_error" },
    }));
    expect(down?.outcome).toBe("skipped");

    const forbidden = CONTRACT_ENDPOINTS.find((item) => item.path === "me/");
    if (!forbidden) throw new Error("me/ yo'q");
    const [result] = await checkEndpoint(forbidden, async () => ({
      status: 403,
      json: { code: "forbidden" },
    }));
    expect(result).toMatchObject({ outcome: "http", status: 403 });
  });
});
