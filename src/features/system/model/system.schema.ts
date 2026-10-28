import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/** `GET /system/health/` (`07_BACKEND_TZ_V2` §7). `key`, `status` — ochiq ro'yxat. */
export const healthSchema = z.object({
  status: z.string(),
  checked_at: z.string(),
  uptime_pct_30d: z.number().nullable(),
  components: z.array(
    z.object({
      key: z.string(),
      status: z.string(),
      latency_ms: z.number().nullable(),
      lag_seconds: z.number().nullable(),
      last_success_at: z.string().nullable(),
      last_error: z.string().nullable(),
    }),
  ),
});
export type Health = Camelized<z.infer<typeof healthSchema>>;
export type HealthComponent = Health["components"][number];

/** `GET /system/sync/`. */
export const syncSchema = z.object({
  sources: z.array(
    z.object({
      source: z.string(),
      last_run_at: z.string().nullable(),
      status: z.string(),
      imported: z.number(),
      failed: z.number(),
      next_run_at: z.string().nullable(),
    }),
  ),
  errors: z.array(
    z.object({
      id: z.number(),
      source: z.string(),
      at: z.string(),
      entity_ref: z.string().nullable(),
      message: z.string(),
    }),
  ),
});
export type Sync = Camelized<z.infer<typeof syncSchema>>;

/** `GET /system/audit/`. */
export const auditSchema = z.object({
  count: z.number(),
  results: z.array(
    z.object({
      id: z.number(),
      at: z.string(),
      actor: z.string(),
      action: z.string(),
      entity: z.string(),
      summary: z.string(),
    }),
  ),
});
export type AuditEntry = Camelized<z.infer<typeof auditSchema>>["results"][number];
