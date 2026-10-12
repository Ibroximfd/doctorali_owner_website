import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { parseJson } from "@/shared/lib/envelope";
import { resetReportsMock } from "@/shared/testing/fixtures/handlers/reports";
import { TEST_NOW, mockGet, mockSend } from "@/shared/testing/mock-api";

import {
  downloadState,
  isExportFormat,
  isExportStatus,
  isReportKind,
  pendingJobIds,
  signedPercent,
  toDigestSettings,
} from "./reports.rules";
import {
  EXPORT_FORMATS,
  REPORT_KINDS,
  digestSchema,
  digestTimeSchema,
  exportCreatedSchema,
  exportStatusSchema,
  exportsResponseSchema,
} from "./reports.schema";

const exportsNow = () => parseJson(exportsResponseSchema, mockGet("reports/exports/")).results;
const statusOf = (jobId: string) => parseJson(exportStatusSchema, mockGet(`reports/export/${jobId}/`));
const digestNow = () => parseJson(digestSchema, mockGet("reports/digest/"));

const requestExport = (body: unknown): string => {
  const response = mockSend("POST", "reports/export/", body);
  expect(response.status).toBe(200);
  return parseJson(exportCreatedSchema, response.json).jobId;
};

/** Sozlamani simdagi (snake_case) ko'rinishga qaytaradi — `saveDigest` yuboradigan tana. */
const toWire = (settings: ReturnType<typeof toDigestSettings>) => ({
  enabled: settings.enabled,
  time: settings.time,
  channels: settings.channels,
  telegram_chat_id: settings.telegramChatId,
  sections: settings.sections,
});

/** Boshqa bo'lim sxemasini import qilmasdan signallar sanog'ini o'qiydi. */
const alertCountsSchema = z.object({ counts: z.object({ open: z.number(), critical: z.number() }) });

beforeEach(() => resetReportsMock());

describe("export contract", () => {
  it("history matches the schema, newest first", () => {
    const jobs = exportsNow();

    expect(jobs.map((job) => job.status)).toEqual(["pending", "ready", "ready"]);
    expect(Date.parse(jobs[0]?.createdAt ?? "")).toBeGreaterThan(Date.parse(jobs[1]?.createdAt ?? ""));
    for (const job of jobs) expect(job.status === "ready").toBe(job.url !== null);
  });

  it.each(REPORT_KINDS.flatMap((report) => EXPORT_FORMATS.map((format) => ({ report, format }))))(
    "accepts an export of $report as $format",
    (request) => {
      const jobId = requestExport({ ...request, period: "30d" });

      expect(exportsNow()[0]).toMatchObject({
        jobId,
        ...request,
        status: "pending",
        url: null,
        filial: null,
      });
    },
  );

  it("resolves the period and the branch of a request on the server", () => {
    requestExport({ report: "debts", format: "xlsx", period: "prev_month", filial: "2" });

    expect(exportsNow()[0]).toMatchObject({ dateFrom: "2026-09-01", dateTo: "2026-09-30", filial: "Qo'qon" });
  });

  it("a job is pending on the first poll and ready on the second, with a link valid for an hour", () => {
    const jobId = requestExport({ report: "daily", format: "pdf", period: "today" });

    expect(statusOf(jobId)).toEqual({ status: "pending", url: null, expiresAt: null });

    const ready = statusOf(jobId);
    expect(ready.status).toBe("ready");
    expect(ready.url).not.toBeNull();
    expect(Date.parse(ready.expiresAt ?? "") - TEST_NOW.getTime()).toBe(60 * 60_000);
    expect(exportsNow()[0]).toMatchObject({ jobId, status: "ready" });
  });

  it("rejects an unknown report or format and an unknown job", () => {
    expect(mockSend("POST", "reports/export/", { report: "payroll", format: "pdf" })).toMatchObject({
      status: 400,
      json: { code: "validation_error" },
    });
    expect(mockSend("POST", "reports/export/", { report: "daily", format: "docx" }).status).toBe(400);
    expect(mockSend("POST", "reports/export/", "nonsense").status).toBe(400);
    expect(() => mockGet("reports/export/exp-0/")).toThrow(/export_not_found/);
  });
});

describe("digest contract", () => {
  it("settings match the schema and carry the numbers of the message preview", () => {
    const digest = digestNow();

    expect(digest).toMatchObject({ enabled: true, time: "21:00", channels: ["telegram"] });
    expect(digest.preview).toMatchObject({
      date: "2026-10-02",
      revenue: 48_100_000,
      revenueDeltaPct: 6.2,
      delivered: 96,
      cancelled: 14,
    });
  });

  it("the preview counts the same open alerts as the alerts list", () => {
    const { counts } = alertCountsSchema.parse(mockGet("alerts/"));

    expect(digestNow().preview).toMatchObject({ alertsOpen: counts.open, alertsCritical: counts.critical });
  });

  it("saving replaces the settings and keeps them for the next read", () => {
    const saved = mockSend("PUT", "reports/digest/", {
      ...toWire(toDigestSettings(digestNow())),
      enabled: false,
      time: "08:30",
    });

    expect(saved.status).toBe(200);
    expect(parseJson(digestSchema, saved.json)).toMatchObject({ enabled: false, time: "08:30" });
    expect(digestNow()).toMatchObject({ enabled: false, time: "08:30", telegramChatId: "104522871" });
  });

  it("rejects a malformed time and a body without the enabled flag", () => {
    expect(mockSend("PUT", "reports/digest/", { enabled: true, time: "25:00" })).toMatchObject({
      status: 400,
      json: { code: "validation_error" },
    });
    expect(mockSend("PUT", "reports/digest/", { time: "21:00" }).status).toBe(400);
    expect(digestNow().time).toBe("21:00");
  });
});

describe("digest time", () => {
  it.each(["00:00", "08:30", "21:00", "23:59", " 09:15 "])("accepts %s", (time) => {
    expect(digestTimeSchema.safeParse({ time }).success).toBe(true);
  });

  it.each([
    ["0830", "08:30"],
    ["830", "08:30"],
    ["9:00", "09:00"],
    ["2100", "21:00"],
    ["21.30", "21:30"],
  ])("accepts %s typed on a phone keypad as %s", (typed, saved) => {
    expect(digestTimeSchema.parse({ time: typed }).time).toBe(saved);
  });

  it.each(["24:00", "21:60", "2460", "21:00:00", "kechqurun", ""])(
    "rejects %s with a message key for the field",
    (time) => {
      const result = digestTimeSchema.safeParse({ time });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("timeInvalid");
    },
  );
});

describe("export rules", () => {
  const ready = {
    status: "ready",
    url: "https://files.example/report.pdf",
    expiresAt: "2026-10-02T10:05:00Z",
  };

  it("offers the download only while the signed link is alive", () => {
    expect(downloadState(ready, Date.parse("2026-10-02T09:30:00Z"))).toBe("available");
    expect(downloadState(ready, Date.parse("2026-10-02T10:05:00Z"))).toBe("expired");
    expect(downloadState({ ...ready, expiresAt: null }, Date.parse("2030-01-01T00:00:00Z"))).toBe(
      "available",
    );
  });

  it("has nothing to download before the file is ready", () => {
    expect(downloadState({ status: "pending", url: null, expiresAt: null }, 0)).toBe("none");
    expect(downloadState({ status: "failed", url: null, expiresAt: null }, 0)).toBe("none");
    expect(downloadState({ status: "running", url: null, expiresAt: null }, 0)).toBe("none");
  });

  it("treats a ready report without a link as expired, as the backend sends it after an hour", () => {
    expect(downloadState({ ...ready, url: null }, 0)).toBe("expired");
  });

  it("polls only the jobs that are still being prepared", () => {
    expect(pendingJobIds(exportsNow())).toEqual(["exp-1003"]);
  });

  it("recognises the contract's reports, formats and statuses and nothing else", () => {
    expect(isReportKind("monthly_pl")).toBe(true);
    expect(isReportKind("payroll")).toBe(false);
    expect(isExportFormat("xlsx")).toBe(true);
    expect(isExportFormat("csv")).toBe(false);
    expect(isExportStatus("failed")).toBe(true);
    expect(isExportStatus("queued")).toBe(false);
  });

  it("signs a percentage change", () => {
    expect(signedPercent(6.2)).toBe("+6,2%");
    expect(signedPercent(-3)).toBe("−3,0%");
    expect(signedPercent(0)).toBe("0,0%");
  });

  it("never sends the server-built preview back when saving", () => {
    expect(toDigestSettings(digestNow())).not.toHaveProperty("preview");
  });
});
