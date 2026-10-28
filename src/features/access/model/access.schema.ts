import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/** Ruxsatlar (`07_BACKEND_TZ_V2` §9). `status`, `platform_role`, `kind` — ochiq ro'yxat. */
export const memberSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  full_name: z.string(),
  phone: z.string().nullable(),
  title: z.string(),
  platform_role: z.string(),
  sections: z.array(z.string()),
  filials: z.array(z.number()),
  regions: z.array(z.string()),
  mask_pii: z.boolean(),
  can_export: z.boolean(),
  expires_at: z.string().nullable(),
  status: z.string(),
  last_seen_at: z.string().nullable(),
  created_at: z.string(),
  note: z.string().nullable(),
});
export type Member = Camelized<z.infer<typeof memberSchema>>;

export const membersSchema = z.object({ results: z.array(memberSchema) });

export const candidatesSchema = z.object({
  results: z.array(
    z.object({
      user_id: z.number(),
      full_name: z.string(),
      phone: z.string().nullable(),
      platform_role: z.string(),
      filial: z.string().nullable(),
      has_access: z.boolean(),
    }),
  ),
});
export type Candidate = Camelized<z.infer<typeof candidatesSchema>>["results"][number];

export const templatesSchema = z.object({
  results: z.array(
    z.object({ key: z.string(), title: z.string(), sections: z.array(z.string()), mask_pii: z.boolean() }),
  ),
});
export type AccessTemplate = Camelized<z.infer<typeof templatesSchema>>["results"][number];

export const activitySchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      at: z.string(),
      member_id: z.number(),
      full_name: z.string(),
      kind: z.string(),
      section: z.string().nullable(),
      detail: z.string().nullable(),
    }),
  ),
});
export type AccessEvent = Camelized<z.infer<typeof activitySchema>>["results"][number];

/** Ruxsat berish / o'zgartirish formasi (UI shakli, camelCase). */
export type GrantInput = {
  userId: number;
  title: string;
  sections: string[];
  filials: number[];
  regions: string[];
  maskPii: boolean;
  canExport: boolean;
  /** `YYYY-MM-DD` yoki `null` — muddatsiz. */
  expiresAt: string | null;
  note: string | null;
  notify: boolean;
};
