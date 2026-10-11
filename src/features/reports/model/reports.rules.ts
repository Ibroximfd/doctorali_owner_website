import { formatPercent } from "@/shared/lib/format";

import {
  EXPORT_FORMATS,
  REPORT_KINDS,
  type Digest,
  type DigestSettings,
  type ExportFormat,
  type ExportJob,
  type ReportKind,
} from "./reports.schema";

export const isReportKind = (value: string): value is ReportKind =>
  (REPORT_KINDS as readonly string[]).includes(value);

export const isExportFormat = (value: string): value is ExportFormat =>
  (EXPORT_FORMATS as readonly string[]).includes(value);

export const EXPORT_STATUSES = ["pending", "running", "ready", "failed"] as const;
export type ExportStatusKey = (typeof EXPORT_STATUSES)[number];

export const isExportStatus = (value: string): value is ExportStatusKey =>
  (EXPORT_STATUSES as readonly string[]).includes(value);

/** Navbatda (`pending`) yoki yasalayotgan (`running`) ish — tugamagan. */
export const isExportInProgress = (status: string): boolean => status === "pending" || status === "running";

/** Hali tayyorlanayotgan ishlar — faqat shularning holati so'rab turiladi. */
export const pendingJobIds = (jobs: readonly ExportJob[]): string[] =>
  jobs.filter((job) => isExportInProgress(job.status)).map((job) => job.jobId);

export type DownloadState = "available" | "expired" | "none";

/**
 * Yuklab olish havolasi faqat tayyor va muddati o'tmagan faylda ko'rsatiladi:
 * imzolangan URL 1 soat yashaydi, undan keyin havola ishlamaydi.
 */
export const downloadState = (
  job: Pick<ExportJob, "status" | "url" | "expiresAt">,
  now: number,
): DownloadState => {
  if (job.status !== "ready") return "none";
  // Muddati o'tgan tayyor hisobotda backend `url: null` qaytaradi (`API_QOLLANMA` §6.2).
  if (!job.url) return "expired";
  if (job.expiresAt !== null && Date.parse(job.expiresAt) <= now) return "expired";
  return "available";
};

/** Ishorali foiz: `6.2` → `+6,2%`, `-3` → `−3,0%`, `0` → `0,0%`. */
export const signedPercent = (value: number): string => {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatPercent(Math.abs(value))}`;
};

/** Saqlanadigan qism: xabar ko'rinishi (`preview`) serverda hisoblanadi — qaytarib yuborilmaydi. */
export const toDigestSettings = ({ preview: _preview, ...settings }: Digest): DigestSettings => settings;
