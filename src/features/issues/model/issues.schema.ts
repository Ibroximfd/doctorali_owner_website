import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/**
 * Muammolar markazi (`07_BACKEND_TZ_V2` §5). `domain`, `severity`, `status`, `kind`,
 * `channel` — ochiq ro'yxat: backend yangi qiymat qo'shsa sahifa yiqilmaydi.
 */
const personSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  role: z.string(),
  phone: z.string().nullable(),
  channels: z.array(z.string()),
});

export const issueSchema = z.object({
  id: z.number(),
  code: z.string(),
  domain: z.string(),
  severity: z.string(),
  status: z.string(),
  title: z.string(),
  cause: z.string(),
  impact: z.object({ kind: z.string(), value: z.number() }).nullable(),
  filial: z.string().nullable(),
  entity: z.object({ type: z.string(), id: z.string(), label: z.string() }).nullable(),
  responsible: personSchema.nullable(),
  detected_at: z.string(),
  updated_at: z.string(),
  notifications_count: z.number(),
  last_notified_at: z.string().nullable(),
});
export type Issue = Camelized<z.infer<typeof issueSchema>>;

/** `GET /issues/`. */
export const issuesResponseSchema = z.object({
  counts: z.object({
    open: z.number(),
    critical: z.number(),
    notified: z.number(),
    resolved_today: z.number(),
  }),
  results: z.array(issueSchema),
});
export type IssuesResponse = Camelized<z.infer<typeof issuesResponseSchema>>;

/** `GET /issues/{id}/` — sabab tafsiloti va tarix. */
export const issueDetailSchema = issueSchema.extend({
  diagnostics: z.array(z.object({ label: z.string(), value: z.string() })),
  timeline: z.array(
    z.object({
      at: z.string(),
      kind: z.string(),
      actor: z.string().nullable(),
      text: z.string().nullable(),
      channel: z.string().nullable(),
    }),
  ),
});
export type IssueDetail = Camelized<z.infer<typeof issueDetailSchema>>;
export type TimelineEvent = IssueDetail["timeline"][number];

/** `GET /issues/recipients/`. */
export const recipientsSchema = z.object({
  results: z.array(personSchema.extend({ filial: z.string().nullable() })),
});
export type Recipient = Camelized<z.infer<typeof recipientsSchema>>["results"][number];

/** `POST /issues/{id}/notify/` javobi: har kanal natijasi + yangilangan muammo. */
export const notifyResultSchema = z.object({
  results: z.array(z.object({ channel: z.string(), status: z.string() })),
  issue: issueSchema,
});
export type NotifyResult = Camelized<z.infer<typeof notifyResultSchema>>;

export type NotifyRequest = {
  recipientId: number;
  channels: string[];
  urgency: "normal" | "urgent";
  message: string;
};
