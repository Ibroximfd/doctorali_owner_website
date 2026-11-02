import { describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { mockGet, mockSend } from "@/shared/testing/mock-api";

import {
  analysisSummary,
  chatFailure,
  countBySeverity,
  draftFailure,
  effectiveSeverity,
  findingAdvice,
  findingDetail,
  findingTitle,
  groupBySeverity,
  mergeMessagePages,
  refreshFailure,
  shiftMonth,
  summaryLines,
  summaryState,
} from "./ai.rules";
import {
  aiChatsSchema,
  aiMessagesPageSchema,
  aiStatusSchema,
  analysisSchema,
  chatAnswerSchema,
  createdChatSchema,
  draftsSchema,
  sentMessageSchema,
  toAnalysis,
  usageSchema,
} from "./ai.schema";

const message = (id: number) => ({
  id,
  role: "user",
  text: `#${id}`,
  lang: "uz",
  model: null,
  toolsUsed: [],
  createdAt: null,
});

describe("owner AI contract (TZ 32 §I, §C-2)", () => {
  it("status and the saved analysis match their schemas", () => {
    expect(parseJson(aiStatusSchema, mockGet("ai/status/")).enabled).toBe(true);
    const analysis = toAnalysis(analysisSchema.parse(mockGet("ai/analysis/", { period: "30d" })));
    expect(analysis.status).toBe("ready");
    expect(analysis.aiAvailable).toBe(true);
    expect(analysis.summaryRu).not.toBeNull();
    expect(countBySeverity(analysis.findings, "urgent")).toBeGreaterThan(0);
  });

  it("an unrefreshed period comes back empty but still with the computed findings", () => {
    const analysis = toAnalysis(analysisSchema.parse(mockGet("ai/analysis/", { period: "7d" })));
    expect(analysis.status).toBe("empty");
    expect(analysis.summary).toBeNull();
    expect(analysis.findings.length).toBeGreaterThan(0);
  });

  it("refresh is a POST and saves the result", () => {
    const response = mockSend("POST", "ai/analysis/", { period: "14d" });
    expect(response.status).toBe(200);
    expect(toAnalysis(analysisSchema.parse(response.json)).status).toBe("ready");
    expect(analysisSchema.parse(mockGet("ai/analysis/", { period: "14d" })).status).toBe("ready");
  });

  it("chats: create (no AI call), send one message, read the history, delete", () => {
    const created = mockSend("POST", "ai/chats/", {});
    expect(created.status).toBe(201);
    const chat = parseJson(createdChatSchema, created.json);
    expect(chat.title).toBeNull();

    const sent = mockSend("POST", `ai/chats/${chat.id}/messages/`, { text: "Pul qayerda?", lang: "uz" });
    expect(sent.status).toBe(201);
    const reply = parseJson(sentMessageSchema, sent.json);
    expect(reply.message.role).toBe("assistant");
    expect(reply.message.toolsUsed).toContain("finance_summary");
    expect(reply.chat?.title).toBe("Pul qayerda?");

    const page = parseJson(aiMessagesPageSchema, mockGet(`ai/chats/${chat.id}/messages/`));
    expect(page.messages.map((item) => item.role)).toEqual(["user", "assistant"]);
    expect(parseJson(aiChatsSchema, mockGet("ai/chats/")).some((item) => item.id === chat.id)).toBe(true);

    expect(mockSend("DELETE", `ai/chats/${chat.id}/`).status).toBe(200);
    expect(mockSend("POST", `ai/chats/${chat.id}/messages/`, { text: "Yana" })).toMatchObject({
      status: 404,
      json: { code: "chat_not_found" },
    });
  });

  it("refuses a message that is too short", () => {
    const chat = parseJson(createdChatSchema, mockSend("POST", "ai/chats/", {}).json);
    expect(mockSend("POST", `ai/chats/${chat.id}/messages/`, { text: "a" })).toMatchObject({
      status: 400,
      json: { code: "validation_error" },
    });
  });

  it("drafts are sent only once; a second send is a conflict", () => {
    const drafts = parseJson(draftsSchema, mockGet("ai/drafts/", { status: "draft" }));
    const first = drafts[0];
    expect(first?.ownerRole).toBe("logistics");
    expect(mockSend("POST", `ai/drafts/${first?.id}/send/`).status).toBe(201);
    expect(mockSend("POST", `ai/drafts/${first?.id}/send/`)).toMatchObject({
      status: 409,
      json: { code: "draft_already_sent" },
    });
  });

  it("usage carries the cost as a string and the limits", () => {
    const usage = parseJson(usageSchema, mockGet("ai/usage/", { month: "2026-10" }));
    expect(typeof usage.costUsd).toBe("string");
    expect(usage.limits?.ratePerMin).toBe(10);
    expect(mockSend("POST", "ai/chat/", { question: "a" })).toMatchObject({ status: 400 });
  });

  it("keeps the legacy single-question answer readable (old prod)", () => {
    const answer = parseJson(
      chatAnswerSchema,
      mockSend("POST", "ai/chat/", { question: "Pul qayerda?" }).json,
    );
    expect(answer.toolsUsed).toContain("finance_summary");
  });

  it("reads an old backend analysis without the new fields", () => {
    const parsed = toAnalysis(
      analysisSchema.parse({ generated_at: "2026-10-31T09:00:00Z", findings: [], ai_summary: "1. Bir" }),
    );
    expect(parsed.status).toBe("ready");
    expect(parsed.summary).toBe("1. Bir");
    expect(parsed.aiAvailable).toBeNull();
    expect(parsed.warehouseFindings).toEqual([]);
  });

  it("parses the keyless-mode analysis: no summary, findings kept", () => {
    const parsed = toAnalysis(
      analysisSchema.parse({
        status: "empty",
        generated_at: null,
        summary: null,
        ai_available: false,
        ai_used: false,
        findings: [{ severity: "attention", title: "Atkaz" }],
      }),
    );
    expect(summaryState(parsed, "uz")).toBe("noKey");
    expect(parsed.findings).toHaveLength(1);
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

  it("treats source_severity urgent as urgent", () => {
    expect(effectiveSeverity({ severity: "attention", source_severity: "urgent" })).toBe("urgent");
    expect(effectiveSeverity({ severity: "good", source_severity: null })).toBe("good");
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

  it("splits the AI summary into points and picks the summary language", () => {
    expect(summaryLines("1. Bir\n2) Ikki\n\n- Uch")).toEqual(["Bir", "Ikki", "Uch"]);
    expect(summaryLines(null)).toEqual([]);
    expect(analysisSummary({ summary: "uz", summaryRu: "ru" }, "ru")).toBe("ru");
    expect(analysisSummary({ summary: "uz", summaryRu: null }, "ru")).toBe("uz");
  });

  it("maps error codes, never the detail text", () => {
    expect(refreshFailure({ code: "analysis_running", kind: "unknown" })).toBe("running");
    expect(refreshFailure({ code: "ai_unavailable", kind: "server" })).toBe("noKey");
    expect(refreshFailure({ code: "rate_limited", kind: "rate-limited" })).toBe("rateLimited");
    expect(chatFailure({ code: "ai_unavailable", kind: "server" })).toBe("unavailable");
    expect(chatFailure({ code: "chat_not_found", kind: "not-found" })).toBe("notFound");
    expect(chatFailure({ code: "too_many_attempts", kind: "rate-limited" })).toBe("rateLimited");
    expect(draftFailure({ code: "draft_discarded" })).toBe("discarded");
  });

  it("merges older pages into one chronological list", () => {
    const merged = mergeMessagePages([
      { messages: [message(5), message(6)] },
      { messages: [message(3), message(4), message(5)] },
    ]);
    expect(merged.map((item) => item.id)).toEqual([3, 4, 5, 6]);
  });

  it("shifts months across a year boundary", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("finding text by language (N-10)", () => {
  const finding = {
    severity: "urgent",
    title: "Skladda 31 ta shoshilinch topilma",
    title_ru: "На складе 31 срочная находка",
    detail: "Kuryer 8 kun harakatsiz",
    detail_ru: null,
  };

  it("uses title_ru / detail_ru in Russian and falls back to the Uzbek text", () => {
    expect(findingTitle(finding, "ru")).toBe("На складе 31 срочная находка");
    expect(findingTitle(finding, "uz")).toBe("Skladda 31 ta shoshilinch topilma");
    expect(findingDetail(finding, "ru")).toBe("Kuryer 8 kun harakatsiz");
    expect(findingTitle({ severity: "good", title: "Sklad", title_ru: "" }, "ru")).toBe("Sklad");
  });

  it("reads the analysis period with both name pairs (B-24)", () => {
    const parsed = analysisSchema.parse({
      generated_at: "x",
      period: { from: "2026-10-02", to: "2026-10-31", date_from: "2026-10-02", date_to: "2026-10-31" },
    });
    expect(parsed.period).toEqual({ date_from: "2026-10-02", date_to: "2026-10-31" });
    expect(analysisSchema.parse({ generated_at: "x", period: null }).period).toBeNull();
  });
});

describe("kalitsiz rejim — 503 body", () => {
  it("reads the analysis block from the 503 body, ignores anything else", async () => {
    const { analysisFromError } = await import("../api/ai.api");
    const fromBody = analysisFromError({
      code: "ai_unavailable",
      analysis: {
        status: "ready",
        generated_at: "2026-11-01T10:05:00Z",
        findings: [{ kind: "otkaz", title: "Atkaz", severity: "attention" }],
        ai_available: false,
      },
    });
    expect(fromBody?.findings).toHaveLength(1);
    expect(analysisFromError({ code: "ai_unavailable" })).toBeNull();
    expect(analysisFromError(null)).toBeNull();
  });
});
