import { describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { mockGet } from "@/shared/testing/mock-api";

import {
  attachmentHref,
  confidenceLevel,
  hasPendingReply,
  healthTone,
  isKnownBlock,
  sortRecommendations,
} from "./ai.rules";
import {
  aiSummarySchema,
  checksSchema,
  findingsResponseSchema,
  messageSchema,
  recommendationsSchema,
  reportsSchema,
} from "./ai.schema";

describe("ai contract", () => {
  it("every read endpoint matches its schema", () => {
    expect(() => {
      parseJson(aiSummarySchema, mockGet("ai/summary/"));
      parseJson(findingsResponseSchema, mockGet("ai/findings/", { status: "all" }));
      parseJson(checksSchema, mockGet("ai/checks/"));
      parseJson(reportsSchema, mockGet("ai/reports/"));
      parseJson(recommendationsSchema, mockGet("ai/recommendations/"));
    }).not.toThrow();
  });

  it("money at risk equals the open findings' amounts", () => {
    const summary = parseJson(aiSummarySchema, mockGet("ai/summary/"));
    const open = parseJson(findingsResponseSchema, mockGet("ai/findings/", { status: "open" })).results;
    expect(open.reduce((sum, row) => sum + (row.amountAtRisk ?? 0), 0)).toBe(summary.moneyAtRisk);
  });

  it("keeps an unknown chat block instead of failing", () => {
    const message = parseJson(messageSchema, {
      id: 1,
      role: "assistant",
      status: "done",
      text: "",
      created_at: "2026-10-28T10:00:00+05:00",
      blocks: [
        { type: "kpis", items: [] },
        { type: "hologram", foo: 1 },
      ],
    });
    expect(message.blocks.filter(isKnownBlock)).toHaveLength(1);
    expect(message.attachments).toEqual([]);
  });
});

describe("ai rules", () => {
  it("maps confidence and health to levels", () => {
    expect(confidenceLevel(86)).toBe("high");
    expect(confidenceLevel(50)).toBe("medium");
    expect(confidenceLevel(10)).toBe("low");
    expect(healthTone(82)).toBe("good");
    expect(healthTone(58)).toBe("crit");
  });

  it("detects pending replies and builds file links", () => {
    expect(hasPendingReply(undefined)).toBe(false);
    expect(hasPendingReply({ messages: [{ status: "pending" } as never] })).toBe(true);
    expect(attachmentHref(33)).toBe("/api/owner/ai/attachments/33/file/");
  });

  it("orders recommendations by priority then horizon", () => {
    const sorted = sortRecommendations([
      { priority: 2, horizon: "now" },
      { priority: 1, horizon: "month" },
      { priority: 1, horizon: "now" },
    ]);
    expect(sorted.map((row) => `${row.priority}-${row.horizon}`)).toEqual(["1-now", "1-month", "2-now"]);
  });
});
