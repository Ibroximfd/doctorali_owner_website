import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { aliases, optStr } from "@/shared/lib/lenient";

/**
 * Sklad — owner logist bilan BIR XIL API dan faqat O'QIYDI (`/api/sklad/*`, v2 §2.10; TZ 18 §3–§6).
 * Egasining qarori: Owner skladga yozmaydi. Owner yozadigan yagona narsa — mahsulot dopuski
 * (`owner/structure/sklad-grants/{filial}/`, v2 §2.9).
 */

const refSchema = z.object({ id: z.number(), name: z.string() });

/** `GET /api/sklad/sklads/` (v2 §4.6). */
export const skladsSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    regions: z.array(z.string()),
    is_active: z.boolean().default(true),
    chief: z.object({ id: z.number(), full_name: z.string() }).nullable(),
    locations: z.number().default(0),
  }),
);
export type Sklad = Camelized<z.infer<typeof skladsSchema>>[number];

/** Mahsulot rasmi: jonli javobda yo'q (savol B-27) — kelsa `image | image_url | photo` dan. */
export const IMAGE_ALIASES = { image: ["image_url", "photo", "thumbnail"] } as const;

/** `GET /api/sklad/items/` (TZ 18 §3.3). */
export const itemsSchema = z.array(
  aliases(
    IMAGE_ALIASES,
    z.object({
      id: z.number(),
      name: z.string(),
      sku: z.string().default(""),
      is_active: z.boolean().default(true),
      image: optStr,
    }),
  ),
);
export type SkladItem = Camelized<z.infer<typeof itemsSchema>>[number];

/** `GET /api/sklad/stock/` (TZ 18 §3.4) — `location × item`; bir sahifa (jonli javob sahifali). */
export const stockPageSchema = z.object({
  count: z.number(),
  next: z.string().nullable().default(null),
  results: z.array(z.unknown()),
});

export const stockSchema = z.array(
  z.object({
    location: z.object({ id: z.number(), name: z.string(), kind: z.string(), region: z.string().nullable() }),
    item: z.object({ id: z.number(), name: z.string() }),
    on_hand: z.number(),
    min_quantity: z.number().default(0),
    is_low: z.boolean().default(false),
  }),
);
export type StockCell = Camelized<z.infer<typeof stockSchema>>[number];

/** `GET /api/sklad/overview/` (TZ 18 §6.1). */
export const overviewSchema = z.object({
  totals: z.object({
    on_hand: z.number(),
    with_couriers: z.number(),
    low_items: z.number(),
    couriers: z.number().default(0),
  }),
  regions: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      on_hand: z.number(),
      with_couriers: z.number().default(0),
      low_items: z.number().default(0),
      status: z.string().default("ok"),
    }),
  ),
});
export type SkladOverview = Camelized<z.infer<typeof overviewSchema>>;

/** `GET /api/sklad/ledger/summary/` (TZ 18 §6.3) — tur → yig'indi (ochiq lug'at). */
export const ledgerSummarySchema = z.record(z.number());

/** Daftar qatori (TZ 18 §3.5). `actor.kind`: `system | logist | chief_courier | courier`. */
export const ledgerRowSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  region: z.string().nullable(),
  location: z.object({ id: z.number(), name: z.string(), kind: z.string() }),
  item: refSchema,
  movement_type: z.string(),
  quantity: z.number(),
  balance_after: z.number().nullable(),
  source: z
    // hujjatda — son, zakazda — UUID satr (jonli javob)
    .object({
      type: z.string(),
      id: z.union([z.number(), z.string()]).nullable(),
      number: z.string().nullable().default(""),
    })
    .nullable(),
  actor: z.object({ full_name: z.string(), kind: z.string() }).nullable(),
  note: z.string().default(""),
});

/** `GET /api/sklad/ledger/` — `{count, next, previous, results}`. */
export const ledgerSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(ledgerRowSchema),
});
export type Ledger = Camelized<z.infer<typeof ledgerSchema>>;
export type LedgerEntry = Ledger["results"][number];

/** `GET /api/sklad/documents/{id}/` (TZ 18 §3.6). */
export const documentSchema = z.object({
  id: z.number(),
  number: z.string(),
  type: z.string(),
  status: z.string(),
  location: z.object({ id: z.number(), name: z.string() }),
  courier: z.object({ full_name: z.string() }).nullable().default(null),
  reason: z.string().nullable(),
  supplier: z.string().default(""),
  ref_number: z.string().default(""),
  note: z.string().default(""),
  lines: z.array(
    z.object({
      item: refSchema,
      quantity: z.number(),
      before: z.number().nullable(),
      after: z.number().nullable(),
    }),
  ),
  total_qty: z.number(),
  created_by: z.object({ full_name: z.string(), kind: z.string() }),
  created_at: z.string(),
});
export type SkladDocument = Camelized<z.infer<typeof documentSchema>>;

/** `GET /api/owner/structure/sklad-grants/{filial}/` (v2 §2.9). */
export const grantsSchema = z.object({
  filial_id: z.number(),
  items: z.array(z.object({ id: z.number(), product_id: z.number(), product_name: z.string() })),
});
export type FilialGrants = Camelized<z.infer<typeof grantsSchema>>;

/** `PUT …/sklad-grants/{filial}/` javobi. */
export const grantsResultSchema = z.object({
  filial_id: z.number(),
  granted: z.array(z.number()),
  revoked: z.array(z.number()),
  item_ids: z.array(z.number()),
});

/* ---------- tarix lug'ati ---------- */

/** Daftar filtri «kim» (`?actor_kind=`, B-8b). */
export const ACTOR_KINDS = ["logist", "chief_courier", "courier", "system"] as const;

export const MOVEMENT_TYPES = [
  "receipt",
  "write_off",
  "adjustment",
  "courier_load",
  "courier_return",
  "sale",
  "gift",
  "sale_points",
  "sale_return",
] as const;
