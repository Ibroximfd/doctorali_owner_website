import { describe, expect, it } from "vitest";

import type { Alert } from "@/shared/domain/alert";

import { formatThreshold, parseThreshold, ruleMessageKey, splitAlerts } from "./alerts.rules";

const alert = (id: number, severity: Alert["severity"], status: Alert["status"]): Alert => ({
  id,
  code: "orders.unassigned_courier",
  severity,
  status,
  title: `signal ${id}`,
  body: "",
  filial: null,
  metricValue: null,
  threshold: null,
  ref: null,
  openedAt: "2026-10-02T09:00:00Z",
  acknowledgedAt: status === "acknowledged" ? "2026-10-02T09:05:00Z" : null,
  resolvedAt: status === "resolved" ? "2026-10-02T09:05:00Z" : null,
});

const ALERTS = [
  alert(1, "critical", "open"),
  alert(2, "serious", "open"),
  alert(3, "serious", "acknowledged"),
  alert(4, "moderate", "resolved"),
];

const ids = (alerts: readonly Alert[]): number[] => alerts.map((item) => item.id);

describe("splitAlerts", () => {
  it("shows every open alert when no severity is chosen", () => {
    const { open, visible, acknowledged } = splitAlerts(ALERTS, null);

    expect(ids(open)).toEqual([1, 2]);
    expect(ids(visible)).toEqual([1, 2]);
    expect(ids(acknowledged)).toEqual([3]);
  });

  it("narrows the open alerts to the chosen severity without touching the acknowledged ones", () => {
    const { open, visible, acknowledged } = splitAlerts(ALERTS, "serious");

    expect(ids(open)).toEqual([1, 2]);
    expect(ids(visible)).toEqual([2]);
    expect(ids(acknowledged)).toEqual([3]);
  });

  it("tells an empty severity apart from an empty list", () => {
    expect(splitAlerts(ALERTS, "moderate")).toMatchObject({ visible: [] });
    expect(splitAlerts(ALERTS, "moderate").open).toHaveLength(2);
    expect(splitAlerts([], null)).toEqual({ open: [], visible: [], acknowledged: [] });
  });

  it("leaves resolved alerts out of both lists", () => {
    const { open, acknowledged } = splitAlerts(ALERTS, null);

    expect([...ids(open), ...ids(acknowledged)]).not.toContain(4);
  });
});

describe("ruleMessageKey", () => {
  it("turns the dotted rule code into a flat translation key", () => {
    expect(ruleMessageKey("orders.unassigned_courier")).toBe("orders_unassigned_courier");
    expect(ruleMessageKey("plan")).toBe("plan");
  });
});

describe("parseThreshold", () => {
  it("reads integers, grouped thousands and a decimal comma", () => {
    expect(parseThreshold("3")).toBe(3);
    expect(parseThreshold("5 000 000")).toBe(5_000_000);
    expect(parseThreshold("5 000 000")).toBe(5_000_000);
    expect(parseThreshold("17,5")).toBe(17.5);
    expect(parseThreshold("0")).toBe(0);
  });

  it("rejects empty, negative and non-numeric input", () => {
    for (const text of ["", "   ", "-5", "abc", "1e3", "12.5.1", "5 mln"])
      expect(parseThreshold(text)).toBeNull();
  });
});

describe("formatThreshold", () => {
  it("groups thousands and keeps decimals with a comma", () => {
    expect(formatThreshold(5_000_000)).toBe("5 000 000");
    expect(formatThreshold(48)).toBe("48");
    expect(formatThreshold(17.5)).toBe("17,5");
  });

  it("round-trips through the parser", () => {
    for (const value of [0, 3, 17.5, 50_000, 5_000_000])
      expect(parseThreshold(formatThreshold(value))).toBe(value);
  });
});
