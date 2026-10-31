import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

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
