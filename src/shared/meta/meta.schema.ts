import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/** `GET /api/owner/meta/` — filiallar va lug'atlar (kamdan-kam o'zgaradi). */
export const metaSchema = z.object({
  filials: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      region: z.string().nullable(),
      is_main: z.boolean(),
      has_clinic: z.boolean(),
      has_sales: z.boolean(),
    }),
  ),
  regions: z.array(z.object({ code: z.string(), name: z.string() })),
  first_data_date: z.string(),
  currency: z.string(),
});

export type Meta = Camelized<z.infer<typeof metaSchema>>;
export type Filial = Meta["filials"][number];
