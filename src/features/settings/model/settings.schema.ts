import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/* ---------- oylik reja (`02_BACKEND_TZ` §7) ---------- */

/** `OwnerTarget`: `filial: null` — filialga bog'lanmagan (masalan onlayn konsultatsiya). Summa — so'mda. */
const targetItemSchema = z.object({
  filial: z.number().nullable(),
  /** `total · delivery · clinic · consultation`; noma'lum kanal yiqitmaydi — o'zgarishsiz saqlanadi. */
  channel: z.string(),
  amount: z.number(),
});

/** `GET /targets/?month=YYYY-MM` va `PUT /targets/` javobi. */
export const targetsSchema = z.object({
  month: z.string(),
  items: z.array(targetItemSchema),
});
export type Targets = Camelized<z.infer<typeof targetsSchema>>;
export type TargetItem = Targets["items"][number];

/** Jadvalda tahrirlanadigan kanallar (filial × kanal). */
export const EDITABLE_CHANNELS = ["delivery", "clinic"] as const;
export type EditableChannel = (typeof EDITABLE_CHANNELS)[number];

/** Forma maydoni: million so'mda. Xato matnlari — tarjima kalitlari (`settings.targets.errors.*`). */
const amountSchema = z
  .number({ invalid_type_error: "amountInvalid", required_error: "amountInvalid" })
  .finite("amountInvalid")
  .min(0, "amountNegative");

/** `null` — bu filialda shu kanal yo'q (maydon chizilmaydi). */
export const targetsFormSchema = z.object({
  rows: z.array(
    z.object({
      filialId: z.number(),
      delivery: amountSchema.nullable(),
      clinic: amountSchema.nullable(),
    }),
  ),
});
export type TargetsFormValues = z.infer<typeof targetsFormSchema>;

/* ---------- faol sessiyalar (§1.2) ---------- */

export const sessionSchema = z.object({
  id: z.string(),
  device: z.string(),
  browser: z.string().nullable(),
  location: z.string().nullable(),
  last_seen_at: z.string(),
  is_current: z.boolean(),
});
export type Session = Camelized<z.infer<typeof sessionSchema>>;

export const sessionsResponseSchema = z.object({ results: z.array(sessionSchema) });

/* ---------- kirish huquqlari ---------- */

/** `GET /settings/access/` — panelni ko'ra oladiganlar. Shakl `me/` dagi foydalanuvchi bilan bir xil. */
export const accessUserSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  role: z.string(),
  /** Bo'sh — hamma bo'lim. */
  sections: z.array(z.string()).default([]),
  /** Bo'sh — barcha filiallar. */
  filials: z.array(z.number()).default([]),
  mask_pii: z.boolean().default(false),
});
export type AccessUser = Camelized<z.infer<typeof accessUserSchema>>;

export const accessResponseSchema = z.object({ results: z.array(accessUserSchema) });
