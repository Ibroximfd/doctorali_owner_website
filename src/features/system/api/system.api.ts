import { parseJson } from "@/shared/lib/envelope";
import { apiGet } from "@/shared/lib/http";

import {
  auditSchema,
  healthSchema,
  syncSchema,
  type AuditEntry,
  type Health,
  type Sync,
} from "../model/system.schema";

export const loadHealth = async (): Promise<Health> =>
  parseJson(healthSchema, await apiGet("system/health/"));

export const loadSync = async (): Promise<Sync> => parseJson(syncSchema, await apiGet("system/sync/"));

export const loadAudit = async (page: number): Promise<{ count: number; results: AuditEntry[] }> =>
  parseJson(auditSchema, await apiGet("system/audit/", { page }));
