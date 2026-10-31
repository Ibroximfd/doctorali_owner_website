import { describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { mockGet, mockSend } from "@/shared/testing/mock-api";

import { findingAdvice, findingDetail, findingTitle, groupBySeverity, summaryLines } from "./ai.rules";
import { aiStatusSchema, analysisSchema, chatAnswerSchema } from "./ai.schema";

describe("owner AI contract (backend v2 §8)", () => {
  it("status, analysis and chat match their schemas", () => {
    expect(parseJson(aiStatusSchema, mockGet("ai/status/")).enabled).toBe(true);
    const analysis = analysisSchema.parse(mockGet("ai/analysis/"));
    expect(analysis.findings.map((finding) => finding.severity)).toEqual(
      [...analysis.findings.map((finding) => finding.severity)].sort(
        (a, b) => ["urgent", "attention", "good"].indexOf(a) - ["urgent", "attention", "good"].indexOf(b),
      ),
    );
    const answer = parseJson(
      chatAnswerSchema,
      mockSend("POST", "ai/chat/", { question: "Pul qayerda?" }).json,
    );
    expect(answer.toolsUsed).toContain("finance_summary");
    expect(answer.period).not.toBeNull();
  });

  it("refuses a question that is too short", () => {
    expect(mockSend("POST", "ai/chat/", { question: "a" })).toMatchObject({
      status: 400,
      json: { code: "validation_error" },
    });
  });

  it("accepts an analysis without the AI summary (no key)", () => {
    const parsed = analysisSchema.parse({
      generated_at: "2026-10-31T09:00:00Z",
      findings: [],
      ai_summary: null,
    });
    expect(parsed.ai_summary).toBeNull();
    expect(parsed.warehouse_findings).toEqual([]);
  });
});

describe("ai rules", () => {
  it("groups findings by severity in the documented order, unknown last", () => {
    const groups = groupBySeverity([
      { severity: "good" },
      { severity: "weird" },
      { severity: "urgent" },
      { severity: "attention" },
    ]);
    expect(groups.map((group) => group.severity)).toEqual(["urgent", "attention", "good", "other"]);
  });

  it("reads title, detail and advice from the known field names", () => {
    const finding = {
      severity: "urgent",
      message: "Kassa farqi",
      description: "3 kun",
      action: "Solishtiring",
    };
    expect(findingTitle(finding)).toBe("Kassa farqi");
    expect(findingDetail(finding)).toBe("3 kun");
    expect(findingAdvice(finding)).toBe("Solishtiring");
    expect(findingTitle({ severity: "good" })).toBe("good");
  });

  it("splits the AI summary into points", () => {
    expect(summaryLines("1. Bir\n2) Ikki\n\n- Uch")).toEqual(["Bir", "Ikki", "Uch"]);
    expect(summaryLines(null)).toEqual([]);
  });
});
