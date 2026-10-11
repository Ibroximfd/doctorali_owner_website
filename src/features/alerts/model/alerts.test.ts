import { describe, expect, it } from "vitest";

import { alertCategory, alertRoute, alertSchema } from "@/shared/domain/alert";
import { parseJson } from "@/shared/lib/envelope";
import { mockGet, mockSend } from "@/shared/testing/mock-api";

import { alertRuleSchema, alertRulesResponseSchema, alertsResponseSchema } from "./alerts.schema";

describe("alerts contract", () => {
  it("list matches the schema and counts only open alerts", () => {
    const { counts, results } = parseJson(alertsResponseSchema, mockGet("alerts/"));

    expect(counts.open).toBe(results.filter((alert) => alert.status === "open").length);
    expect(counts.critical + counts.serious + counts.moderate).toBe(counts.open);
  });

  it("rules match the schema", () => {
    expect(parseJson(alertRulesResponseSchema, mockGet("alerts/rules/")).results.length).toBeGreaterThan(5);
  });

  it("acknowledging moves an alert out of the open count", () => {
    const before = parseJson(alertsResponseSchema, mockGet("alerts/"));
    const target = before.results.find((alert) => alert.status === "open");
    if (!target) throw new Error("sample has no open alert");

    const response = mockSend("POST", `alerts/${target.id}/ack/`);
    expect(response.status).toBe(200);
    expect(parseJson(alertSchema, response.json).status).toBe("acknowledged");

    const after = parseJson(alertsResponseSchema, mockGet("alerts/"));
    expect(after.counts.open).toBe(before.counts.open - 1);
  });

  it("acknowledging an unknown alert is a 404 with a code", () => {
    expect(mockSend("POST", "alerts/1/ack/")).toMatchObject({
      status: 404,
      json: { code: "alert_not_found" },
    });
  });

  it("a rule patch changes the threshold and rejects a malformed body", () => {
    const updated = mockSend("PATCH", "alerts/rules/orders.unassigned_courier/", {
      params: { threshold: 5 },
    });
    expect(parseJson(alertRuleSchema, updated.json).params.threshold).toBe(5);

    expect(mockSend("PATCH", "alerts/rules/orders.unassigned_courier/", "nonsense").status).toBe(400);
  });
});

describe("alert routing", () => {
  it("derives the category from the code prefix", () => {
    expect(alertCategory("orders.unassigned_courier")).toBe("orders");
  });

  it("sends each category to the section where it can be acted on", () => {
    expect(alertRoute("cod.unsettled")).toBe("logistics");
    expect(alertRoute("clinic.closing_mismatch")).toBe("finance");
    expect(alertRoute("stock.out")).toBe("products");
  });

  it("keeps unknown categories on the alerts page", () => {
    expect(alertRoute("brand_new.thing")).toBe("alerts");
  });
});
