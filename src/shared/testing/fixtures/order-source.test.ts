import { describe, expect, it } from "vitest";

import { mockGet } from "@/shared/testing/mock-api";

/**
 * Zakaz manbasi (`app` | `operator`) bo'limlar orasida bir xil: «Ilova» bo'limi, Moliya va
 * Analitikadagi «Ilovadan» filtri bitta manbadan; ilova + operator = hammasi (aniq).
 * Javoblar xom (snake_case) — feature sxemalarisiz, shuning uchun shu yerda.
 */
type Envelope<T> = { data: T };
type Totals = Record<string, number>;
type FilialRow = { id: number; revenue: number; delivered: number; total?: number };

const data = <T>(path: string, query: Record<string, string>) => (mockGet(path, query) as Envelope<T>).data;
const finance = (query: Record<string, string>) =>
  data<{ totals: Totals; filials: FilialRow[] }>("finance/v2/", { period: "30d", ...query });
const analytics = (query: Record<string, string>) =>
  data<{ totals: Totals; filials: FilialRow[] }>("analytics/v2/", { period: "30d", ...query });

describe("order source", () => {
  it("«Ilova» section shows exactly what Finance and Analytics show for «Ilovadan»", () => {
    const app = data<{ orders: { revenue: number; statuses: Totals; filials: FilialRow[] } }>("app/v2/", {
      period: "30d",
    }).orders;
    expect(finance({ source: "app" }).totals.revenue).toBe(app.revenue);
    expect(analytics({ source: "app" }).totals.delivered).toBe(app.statuses.delivered);
    expect(analytics({ source: "app" }).totals.cancelled).toBe(app.statuses.cancelled);
    for (const filial of app.filials) {
      expect(finance({ source: "app" }).filials.find((row) => row.id === filial.id)?.revenue).toBe(
        filial.revenue,
      );
      expect(analytics({ source: "app" }).filials.find((row) => row.id === filial.id)?.delivered).toBe(
        filial.delivered,
      );
    }
  });

  it("the money chain ignores the source (backend B-12)", () => {
    for (const key of ["handed", "at_chiefs", "at_couriers"]) {
      expect(finance({ source: "app" }).totals[key]).toBe(finance({}).totals[key]);
      expect(finance({ source: "operator" }).totals[key]).toBe(finance({}).totals[key]);
    }
  });

  it("app + operator = all, for revenue and for orders", () => {
    for (const key of ["revenue", "addresses"]) {
      expect(
        (finance({ source: "app" }).totals[key] ?? 0) + (finance({ source: "operator" }).totals[key] ?? 0),
      ).toBe(finance({}).totals[key]);
    }
    for (const key of ["sold", "delivered", "cancelled"]) {
      expect(
        (analytics({ source: "app" }).totals[key] ?? 0) +
          (analytics({ source: "operator" }).totals[key] ?? 0),
      ).toBe(analytics({}).totals[key]);
    }
  });
});
