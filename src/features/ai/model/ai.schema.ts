import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/**
 * AI tahlil (`07_BACKEND_TZ_V2` §8). Hamma enum maydonlar — ochiq satr: backend yangi
 * toifa yoki holat qo'shsa sahifa yiqilmaydi. Matnlar backenddan `X-Lang` tilida keladi.
 */

/** `GET /ai/summary/`. */
export const aiSummarySchema = z.object({
  status: z.string(),
  health_score: z.number().nullable(),
  headline: z.string().nullable(),
  last_run_at: z.string().nullable(),
  next_run_at: z.string().nullable(),
  findings_open: z.number(),
  findings_critical: z.number(),
  money_at_risk: z.number(),
  checks_total: z.number(),
  checks_failed: z.number(),
  checks_warn: z.number(),
  cost_month_usd: z.number(),
  budget_month_usd: z.number(),
});
export type AiSummary = Camelized<z.infer<typeof aiSummarySchema>>;

const evidenceSchema = z.object({ label: z.string(), value: z.string(), source: z.string() });

export const findingSchema = z.object({
  id: z.number(),
  category: z.string(),
  domain: z.string(),
  severity: z.string(),
  confidence: z.number(),
  verified: z.boolean(),
  title: z.string(),
  summary: z.string(),
  amount_at_risk: z.number().nullable(),
  evidence: z.array(evidenceSchema),
  recommendation: z.string(),
  related_checks: z.array(z.string()),
  status: z.string(),
  issue_id: z.number().nullable(),
  period_from: z.string(),
  period_to: z.string(),
  detected_at: z.string(),
});
export type Finding = Camelized<z.infer<typeof findingSchema>>;

/** `GET /ai/findings/`. */
export const findingsResponseSchema = z.object({
  counts: z.object({
    open: z.number(),
    critical: z.number(),
    confirmed: z.number(),
    false_positive: z.number(),
  }),
  results: z.array(findingSchema),
});
export type FindingsResponse = Camelized<z.infer<typeof findingsResponseSchema>>;

/** `POST /ai/findings/{id}/escalate/`. */
export const escalateSchema = z.object({ issue_id: z.number() });

/** `GET /ai/checks/`. */
export const checksSchema = z.object({
  results: z.array(
    z.object({
      code: z.string(),
      title: z.string(),
      status: z.string(),
      expected: z.number().nullable(),
      actual: z.number().nullable(),
      diff: z.number().nullable(),
      unit: z.string(),
      sources: z.array(z.string()),
      checked_at: z.string(),
    }),
  ),
});
export type AiCheck = Camelized<z.infer<typeof checksSchema>>["results"][number];

/** `GET /ai/reports/`. */
export const reportsSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      kind: z.string(),
      period_from: z.string(),
      period_to: z.string(),
      created_at: z.string(),
      health_score: z.number().nullable(),
      headline: z.string(),
      highlights: z.array(z.string()),
      risks: z.array(z.string()),
      actions: z.array(z.string()),
    }),
  ),
});
export type AiReport = Camelized<z.infer<typeof reportsSchema>>["results"][number];

/** `GET /ai/recommendations/`. */
export const recommendationsSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      area: z.string(),
      priority: z.number(),
      horizon: z.string(),
      effort: z.string(),
      title: z.string(),
      rationale: z.string(),
      expected_effect: z.string(),
      evidence: z.array(evidenceSchema),
      status: z.string(),
    }),
  ),
});
export type Recommendation = Camelized<z.infer<typeof recommendationsSchema>>["results"][number];

/* ---------- chat ---------- */

const kpisBlock = z.object({
  type: z.literal("kpis"),
  title: z.string().nullable().optional(),
  items: z.array(
    z.object({ label: z.string(), value: z.string(), delta_pct: z.number().nullable().optional() }),
  ),
});
const tableBlock = z.object({
  type: z.literal("table"),
  title: z.string().nullable().optional(),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});
const bulletsBlock = z.object({
  type: z.literal("bullets"),
  title: z.string().nullable().optional(),
  items: z.array(z.string()),
});
/** Noma'lum blok turi yiqitmaydi — `unknown` sifatida o'tkazib yuboriladi. */
const unknownBlock = z.object({ type: z.string() }).passthrough();

const chartBlock = z.object({
  type: z.literal("chart"),
  title: z.string().nullable().optional(),
  kind: z.string(),
  labels: z.array(z.string()),
  series: z.array(z.object({ name: z.string(), values: z.array(z.number()) })),
  unit: z.string(),
});
const linksBlock = z.object({
  type: z.literal("links"),
  title: z.string().nullable().optional(),
  items: z.array(z.object({ label: z.string(), kind: z.string(), id: z.string() })),
});

const blockSchema = z.union([kpisBlock, tableBlock, bulletsBlock, chartBlock, linksBlock, unknownBlock]);

export const messageSchema = z.object({
  id: z.number(),
  role: z.string(),
  status: z.string(),
  text: z.string(),
  created_at: z.string(),
  blocks: z.array(blockSchema).default([]),
  attachments: z
    .array(z.object({ id: z.number(), title: z.string(), format: z.string(), status: z.string() }))
    .default([]),
  suggestions: z.array(z.string()).default([]),
});
export type ChatMessage = Camelized<z.infer<typeof messageSchema>>;
export type ChatBlock = ChatMessage["blocks"][number];
export type ChatAttachment = ChatMessage["attachments"][number];

export const chatSchema = z.object({
  id: z.number(),
  title: z.string(),
  updated_at: z.string(),
  messages: z.array(messageSchema),
});
export type Chat = Camelized<z.infer<typeof chatSchema>>;

export const chatsSchema = z.object({
  results: z.array(z.object({ id: z.number(), title: z.string(), updated_at: z.string() })),
});
export type ChatListItem = Camelized<z.infer<typeof chatsSchema>>["results"][number];

/** `POST /ai/chats/{id}/messages/` → 202. */
export const sendResultSchema = z.object({ message: messageSchema, reply: messageSchema });

/* ---------- avto-tuzatish (`08_PLATFORM_ACCESS_AND_AI_OPS` §B) ---------- */

export const actionSchema = z.object({
  id: z.number(),
  playbook: z.string(),
  risk: z.string(),
  mode: z.string(),
  status: z.string(),
  title: z.string(),
  reason: z.string(),
  impact: z.object({ kind: z.string(), value: z.number() }).nullable(),
  preview: z.array(z.object({ label: z.string(), before: z.string(), after: z.string() })).default([]),
  preview_more: z.number().default(0),
  proposed_at: z.string(),
  executed_at: z.string().nullable(),
  undo_until: z.string().nullable(),
  decided_by: z.string().nullable(),
});
export type AiAction = Camelized<z.infer<typeof actionSchema>>;

export const actionsResponseSchema = z.object({
  counts: z.object({ proposed: z.number(), auto_today: z.number(), undone: z.number() }),
  results: z.array(actionSchema),
});
export type ActionsResponse = Camelized<z.infer<typeof actionsResponseSchema>>;

export const autopilotSchema = z.object({
  enabled: z.boolean(),
  playbooks: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      risk: z.string(),
      mode: z.string(),
      allowed_modes: z.array(z.string()),
      runs_today: z.number(),
    }),
  ),
});
export type Autopilot = Camelized<z.infer<typeof autopilotSchema>>;
