import { describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { mockGet } from "@/shared/testing/mock-api";

import {
  ageOf,
  availableChannels,
  costliest,
  countByTab,
  defaultMessage,
  MESSAGE_MAX,
  sortIssues,
  statusProgress,
  summarizeDomains,
  tabOf,
} from "./issues.rules";
import { issueDetailSchema, issuesResponseSchema, recipientsSchema } from "./issues.schema";

describe("issues contract", () => {
  it("list, detail and recipients match their schemas", () => {
    const open = parseJson(issuesResponseSchema, mockGet("issues/", { status: "open" }));
    const all = parseJson(issuesResponseSchema, mockGet("issues/", { status: "all" }));
    expect(open.results.every((issue) => issue.status !== "resolved")).toBe(true);
    expect(all.results.length).toBeGreaterThan(open.results.length);
    expect(open.counts.open).toBe(open.results.length);
    expect(() => parseJson(issueDetailSchema, mockGet("issues/501/"))).not.toThrow();
    expect(() =>
      parseJson(recipientsSchema, mockGet("issues/recipients/", { domain: "warehouse" })),
    ).not.toThrow();
  });

  it("filters by domain", () => {
    const warehouse = parseJson(
      issuesResponseSchema,
      mockGet("issues/", { status: "all", domain: "warehouse" }),
    );
    expect(warehouse.results.map((issue) => issue.domain)).toEqual(["warehouse"]);
  });
});

describe("issues rules", () => {
  it("sorts by severity, keeps resolved last", () => {
    const all = parseJson(issuesResponseSchema, mockGet("issues/", { status: "all" })).results;
    const sorted = sortIssues(all);
    expect(sorted[0]?.severity).toBe("critical");
    expect(sorted.at(-1)?.status).toBe("resolved");
  });

  it("builds a message from the template and keeps it within the limit", () => {
    const message = defaultMessage(
      ({ name, title, cause }) => `${name}: ${title} — ${cause}`,
      { title: "Qoldiq kam", cause: "x".repeat(2000) },
      "Sardor Aliyev",
    );
    expect(message.startsWith("Sardor: Qoldiq kam")).toBe(true);
    expect(message.length).toBe(MESSAGE_MAX);
  });

  it("keeps only known channels", () => {
    expect(availableChannels(["sms", "pigeon", "telegram"])).toEqual(["telegram", "sms"]);
  });
});

describe("issues board rules", () => {
  it("groups statuses into the three tabs", () => {
    expect(tabOf("open")).toBe("open");
    expect(tabOf("notified")).toBe("open");
    expect(tabOf("acknowledged")).toBe("progress");
    expect(tabOf("in_progress")).toBe("progress");
    expect(tabOf("resolved")).toBe("resolved");
    expect(countByTab([{ status: "open" }, { status: "in_progress" }, { status: "resolved" }])).toEqual({
      open: 1,
      progress: 1,
      resolved: 1,
    });
  });

  it("summarizes domains with their worst severity", () => {
    const summary = summarizeDomains([
      { domain: "finance", severity: "medium" },
      { domain: "finance", severity: "critical" },
    ]);
    expect(summary.find((item) => item.domain === "finance")).toEqual({
      domain: "finance",
      count: 2,
      worst: "critical",
    });
    expect(summary.find((item) => item.domain === "system")?.worst).toBeNull();
  });

  it("fills the ring by status and finds the costliest issue", () => {
    expect(statusProgress("open")).toBeCloseTo(0.2);
    expect(statusProgress("resolved")).toBe(1);
    expect(statusProgress("unknown")).toBe(0);
    const money = { impact: { kind: "money", value: 5 } };
    expect(costliest([{ impact: null }, money, { impact: { kind: "units", value: 99 } }])).toBe(money);
  });

  it("measures the age in the largest whole unit", () => {
    const now = Date.parse("2026-10-28T12:00:00Z");
    expect(ageOf("2026-10-28T11:20:00Z", now)).toEqual({ value: 40, unit: "minutes" });
    expect(ageOf("2026-10-28T07:00:00Z", now)).toEqual({ value: 5, unit: "hours" });
    expect(ageOf("2026-10-25T12:00:00Z", now)).toEqual({ value: 3, unit: "days" });
  });
});
