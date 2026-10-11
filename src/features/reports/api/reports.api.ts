import { parseJson } from "@/shared/lib/envelope";
import { apiGet, apiSend } from "@/shared/lib/http";

import {
  digestSchema,
  exportCreatedSchema,
  exportStatusSchema,
  exportsResponseSchema,
  type Digest,
  type DigestSettings,
  type ExportJob,
  type ExportRequest,
  type ExportStatus,
} from "../model/reports.schema";

/** Eksport ishini yaratadi; javob — kuzatish uchun ish raqami. */
export const requestExport = async (request: ExportRequest): Promise<string> =>
  parseJson(exportCreatedSchema, await apiSend("post", "reports/export/", request)).jobId;

export const loadExportStatus = async (jobId: string): Promise<ExportStatus> =>
  parseJson(exportStatusSchema, await apiGet(`reports/export/${encodeURIComponent(jobId)}/`));

export const loadExports = async (): Promise<ExportJob[]> =>
  parseJson(exportsResponseSchema, await apiGet("reports/exports/")).results;

export const loadDigest = async (): Promise<Digest> =>
  parseJson(digestSchema, await apiGet("reports/digest/"));

export const saveDigest = async (settings: DigestSettings): Promise<Digest> =>
  parseJson(
    digestSchema,
    await apiSend("put", "reports/digest/", {
      enabled: settings.enabled,
      time: settings.time,
      channels: settings.channels,
      telegram_chat_id: settings.telegramChatId,
      sections: settings.sections,
    }),
  );
