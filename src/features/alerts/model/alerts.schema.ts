import { z } from "zod";

import { ALERT_SEVERITIES, alertSchema } from "@/shared/domain/alert";
import type { Camelized } from "@/shared/lib/camelize";

/** `GET /alerts/` — ro'yxat + ochiq signallar sanog'i. */
export const alertsResponseSchema = z.object({
  counts: z.object({ open: z.number(), critical: z.number(), serious: z.number(), moderate: z.number() }),
  results: z.array(alertSchema),
});
export type AlertsResponse = Camelized<z.infer<typeof alertsResponseSchema>>;

export const RULE_UNITS = ["hours", "days", "uzs", "pct", "count"] as const;

/** Signal qoidasi: qachon signal chiqadi (chegara) va yoqilganmi. */
export const alertRuleSchema = z.object({
  code: z.string(),
  enabled: z.boolean(),
  severity: z.enum(ALERT_SEVERITIES),
  params: z.object({ threshold: z.number() }),
  unit: z.enum(RULE_UNITS),
});
export type AlertRule = Camelized<z.infer<typeof alertRuleSchema>>;

export const alertRulesResponseSchema = z.object({ results: z.array(alertRuleSchema) });

export type AlertRulePatch = { enabled?: boolean; threshold?: number };
