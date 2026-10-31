import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { shortFilialCode } from "@/shared/lib/filial-code";

/** `GET /api/owner/meta/` — filiallar va lug'atlar (kamdan-kam o'zgaradi). */
export const metaSchema = z.object({
  filials: z.array(
    z.object({
      id: z.number(),
      /** Qisqa belgi: `Q`, `T1`, `T2` — namuna kengaytmasi; backendda yo'q bo'lishi mumkin (savol B-3). */
      code: z.string().nullable().default(null),
      name: z.string(),
      region: z.string().nullable(),
      is_main: z.boolean(),
    }),
  ),
  regions: z.array(z.object({ code: z.string(), name: z.string() })),
  first_data_date: z.string(),
  currency: z.string(),
});

export type Meta = Camelized<z.infer<typeof metaSchema>>;
export type Filial = Meta["filials"][number];

/** Filial belgisi: `code` bo'lsa o'zi, aks holda nomidan (`shared/lib/filial-code`). */
export const filialCode = (filial: { code: string | null; name: string }): string => shortFilialCode(filial);
