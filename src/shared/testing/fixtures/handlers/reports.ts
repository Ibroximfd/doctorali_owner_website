import { addDays, tashkentDate } from "@/shared/lib/scope";

import { MOCK_FILIALS, resolvePeriod, type MockContext } from "../engine";
import { sample } from "../sample";
import { mockError, type MockHandler } from "../types";
import { openAlerts } from "./alerts";

const REPORTS = ["daily", "weekly", "monthly_pl", "operators", "couriers_cod", "debts", "products"];
const FORMATS = ["xlsx", "pdf"];

const MINUTE_MS = 60_000;
/** Imzolangan havola muddati (`02_BACKEND_TZ` §8). */
const LINK_TTL_MS = 60 * MINUTE_MS;
/** Namuna rejimida fayl ikkinchi so'rovda "tayyor" bo'ladi. */
const READY_AFTER_POLLS = 2;
const FIRST_NEW_JOB = 1004;

type JobStatus = "pending" | "ready" | "failed";

type Job = {
  id: string;
  report: string;
  format: string;
  dateFrom: string;
  dateTo: string;
  filial: string | null;
  status: JobStatus;
  createdAt: string;
  readyAt: string | null;
  polls: number;
};

const minutesAgo = (now: Date, minutes: number): string =>
  new Date(now.getTime() - minutes * MINUTE_MS).toISOString();

/** Boshlang'ich tarix (prototipdagi uch qator) — birinchi so'rov vaqtiga nisbatan. */
const seedJobs = (now: Date): Job[] => {
  const today = tashkentDate(now);
  const previousMonth = resolvePeriod(new URLSearchParams({ period: "prev_month" }), now);
  const month = { dateFrom: previousMonth.from, dateTo: previousMonth.to };

  return [
    {
      id: "exp-1003",
      report: "operators",
      format: "xlsx",
      ...month,
      filial: "Toshkent",
      status: "pending",
      createdAt: minutesAgo(now, 2),
      readyAt: null,
      polls: 0,
    },
    {
      id: "exp-1002",
      report: "monthly_pl",
      format: "pdf",
      ...month,
      filial: null,
      status: "ready",
      createdAt: minutesAgo(now, 293),
      readyAt: minutesAgo(now, 292),
      polls: 0,
    },
    {
      id: "exp-1001",
      report: "couriers_cod",
      format: "xlsx",
      dateFrom: addDays(today, -7),
      dateTo: addDays(today, -1),
      filial: "Qo'qon",
      status: "ready",
      createdAt: minutesAgo(now, 1165),
      readyAt: minutesAgo(now, 1164),
      polls: 0,
    },
  ];
};

type DigestSettings = {
  enabled: boolean;
  time: string;
  channels: string[];
  telegram_chat_id: string | null;
  sections: string[];
};

const DEFAULT_DIGEST: DigestSettings = {
  enabled: true,
  time: "21:00",
  channels: ["telegram"],
  telegram_chat_id: "104522871",
  sections: ["revenue", "orders", "clinic", "cod", "alerts"],
};

/** Eksport ishlari va xulosa sozlamasi — server jarayoni xotirasida (namuna rejimi uchun yetarli). */
let jobs: Job[] | null = null;
let nextJobNumber = FIRST_NEW_JOB;
let digest: DigestSettings = { ...DEFAULT_DIGEST };

const jobsAt = (now: Date): Job[] => (jobs ??= seedJobs(now));

/** Testlar uchun: xotiradagi holatni boshlang'ich ko'rinishga qaytaradi. */
export const resetReportsMock = (): void => {
  jobs = null;
  nextJobNumber = FIRST_NEW_JOB;
  digest = { ...DEFAULT_DIGEST };
};

const jobState = (job: Job) => ({
  status: job.status,
  url: job.status === "ready" ? `/api/owner/reports/export/${job.id}/file/` : null,
  expires_at: job.readyAt === null ? null : new Date(Date.parse(job.readyAt) + LINK_TTL_MS).toISOString(),
});

const jobRow = (job: Job) => ({
  job_id: job.id,
  report: job.report,
  format: job.format,
  date_from: job.dateFrom,
  date_to: job.dateTo,
  filial: job.filial,
  created_at: job.createdAt,
  ...jobState(job),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** `"1,3"` → `"Toshkent, Samarqand"`; bo'sh yoki noma'lum — `null` (barcha filiallar). */
const filialNames = (value: unknown): string | null => {
  const ids = String(value ?? "")
    .split(",")
    .map((part) => Number(part));
  const names = MOCK_FILIALS.filter((filial) => ids.includes(filial.id)).map((filial) => filial.name);
  return names.length > 0 ? names.join(", ") : null;
};

/** So'rov tanasidagi davr maydonlari (`period`, `date_from`, `date_to`) — umumiy shartnomadagidek. */
const periodParams = (body: Record<string, unknown>): URLSearchParams => {
  const params = new URLSearchParams();
  for (const key of ["period", "date_from", "date_to"]) {
    const value = body[key];
    if (typeof value === "string") params.set(key, value);
  }
  return params;
};

const createExport = (ctx: MockContext) => {
  const body = ctx.body;
  if (!isRecord(body) || typeof body.report !== "string" || typeof body.format !== "string")
    return mockError(400, "validation_error");
  if (!REPORTS.includes(body.report) || !FORMATS.includes(body.format))
    return mockError(400, "validation_error");

  const period = resolvePeriod(periodParams(body), ctx.now);
  const job: Job = {
    id: `exp-${nextJobNumber}`,
    report: body.report,
    format: body.format,
    dateFrom: period.from,
    dateTo: period.to,
    filial: filialNames(body.filial),
    status: "pending",
    createdAt: ctx.now.toISOString(),
    readyAt: null,
    polls: 0,
  };
  nextJobNumber += 1;
  jobsAt(ctx.now).unshift(job);
  return { job_id: job.id };
};

const exportStatus = (ctx: MockContext) => {
  const job = jobsAt(ctx.now).find((item) => item.id === ctx.params.id);
  if (!job) return mockError(404, "export_not_found");

  if (job.status === "pending") {
    job.polls += 1;
    if (job.polls >= READY_AFTER_POLLS) {
      job.status = "ready";
      job.readyAt = ctx.now.toISOString();
    }
  }
  return jobState(job);
};

/** Bugungi kun raqamlari (xabar namunasi uchun; `sample` da alohida "bugun" kesimi yo'q). */
const TODAY = { orders: 131, clinicRevenue: 17_400_000, clinicVisits: 74 } as const;

const stageCount = (status: string): number =>
  sample.pipelineNow.find((stage) => stage.status === status)?.count ?? 0;

/** Xulosa xabari `overview` raqamlari va ochiq signallardan yig'iladi. */
const digestPreview = (ctx: MockContext) => {
  const alerts = openAlerts(ctx);
  const { today, todaySameTimeYesterday } = sample.quick;

  return {
    date: ctx.today,
    revenue: Math.round(today),
    revenue_delta_pct: Math.round((today / todaySameTimeYesterday - 1) * 1000) / 10,
    orders: TODAY.orders,
    delivered: stageCount("delivered"),
    cancelled: stageCount("cancelled"),
    clinic_revenue: TODAY.clinicRevenue,
    clinic_visits: TODAY.clinicVisits,
    courier_cod: Math.round(sample.cash.courierCod),
    alerts_open: alerts.length,
    alerts_critical: alerts.filter((alert) => alert.severity === "critical").length,
  };
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const saveDigest = (ctx: MockContext) => {
  const body = ctx.body;
  if (!isRecord(body) || typeof body.enabled !== "boolean") return mockError(400, "validation_error");
  if (typeof body.time !== "string" || !TIME_PATTERN.test(body.time))
    return mockError(400, "validation_error", "time must be HH:MM");

  digest = {
    enabled: body.enabled,
    time: body.time,
    channels: isStringList(body.channels) ? body.channels : digest.channels,
    telegram_chat_id:
      typeof body.telegram_chat_id === "string" || body.telegram_chat_id === null
        ? body.telegram_chat_id
        : digest.telegram_chat_id,
    sections: isStringList(body.sections) ? body.sections : digest.sections,
  };
  return { ...digest, preview: digestPreview(ctx) };
};

/** `reports` bo'limi namunalari (`02_BACKEND_TZ` §8). */
export const reportsHandlers: MockHandler[] = [
  { method: "POST", path: "reports/export/", resolve: createExport },
  { method: "GET", path: "reports/export/:id/", resolve: exportStatus },
  { method: "GET", path: "reports/exports/", resolve: (ctx) => ({ results: jobsAt(ctx.now).map(jobRow) }) },
  { method: "GET", path: "reports/digest/", resolve: (ctx) => ({ ...digest, preview: digestPreview(ctx) }) },
  { method: "PUT", path: "reports/digest/", resolve: saveDigest },
];
