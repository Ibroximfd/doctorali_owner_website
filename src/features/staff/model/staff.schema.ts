import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/**
 * Xodimlar reytingi (`08_PLATFORM_ACCESS_AND_AI_OPS` §F). Ustunlar backenddan keladi —
 * yangi rol yoki ko'rsatkich qo'shilsa panel kodga tegmasdan chizadi. `metrics` kalitlari
 * chegarada camelCase bo'ladi; ustun `key` (snake_case) bilan `metricValue` orqali o'qiladi.
 */
const columnSchema = z.object({ key: z.string(), unit: z.string(), better: z.enum(["higher", "lower"]) });

const metricsSchema = z.record(z.number().nullable());

const rowSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  team: z.string().nullable(),
  team_id: z.number().nullable(),
  filial: z.string().nullable(),
  score: z.number().nullable(),
  rank: z.number(),
  rank_delta: z.number().nullable(),
  metrics: metricsSchema,
  trend: z.array(z.number()),
  badges: z.array(z.string()),
  status_now: z.string().nullable(),
});

export const leaderboardSchema = z.object({
  role: z.string(),
  columns: z.array(columnSchema),
  rows: z.array(rowSchema),
});

export const teamsSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    lead: z.string().nullable(),
    members: z.number(),
    score: z.number().nullable(),
    metrics: metricsSchema,
  }),
);

export const profileSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  role: z.string(),
  team: z.string().nullable(),
  filial: z.string().nullable(),
  hired_at: z.string().nullable(),
  score: z.number().nullable(),
  rank: z.number(),
  rank_of: z.number(),
  columns: z.array(columnSchema),
  metrics: metricsSchema,
  team_avg: metricsSchema,
  funnel: z.array(z.object({ key: z.string(), value: z.number() })),
  score_trend: z.object({ labels: z.array(z.string()), values: z.array(z.number()) }),
  ratings: z.object({ avg: z.number(), count: z.number(), distribution: z.record(z.number()) }).nullable(),
  recent_reviews: z.array(z.object({ at: z.string(), stars: z.number(), text: z.string().nullable() })),
  ai_summary: z.string().nullable(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export type StaffColumn = z.infer<typeof columnSchema>;
export type Leaderboard = Camelized<z.infer<typeof leaderboardSchema>>;
export type StaffRow = Leaderboard["rows"][number];
export type Team = Camelized<z.infer<typeof teamsSchema>>[number];
export type StaffProfile = Camelized<z.infer<typeof profileSchema>>;
