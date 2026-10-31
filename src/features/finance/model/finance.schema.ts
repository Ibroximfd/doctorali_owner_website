import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import {
  aliases,
  balance,
  flattenRef,
  list,
  num,
  optNum,
  str,
  toNumber,
  withDefaults,
  withFilialCode,
} from "@/shared/lib/lenient";

/**
 * «Moliya» — `GET /api/owner/finance/v2/` (B-12). Jonli javob (2026-10-31): `totals`
 * (`with_couriers`, `with_chiefs`, `handed_over`), `by_filial[{filial:{id,name}, …}]`,
 * `chiefs[{seat_id, full_name, by_filial}]`, `handovers[{chief, filial, status, …}]`,
 * `regions[{region, otkaz, revenue}]`. Manzil narxi, manzillar soni va bosh kuryer haqi
 * javobda yo'q — 0 bo'lib turadi. `?source=` pul zanjiriga qo'llanmaydi (backend qoidasi).
 */
const MONEY_ALIASES = {
  at_couriers: ["with_couriers"],
  at_chiefs: ["with_chiefs"],
  handed: ["handed_over", "handed_to_filials"],
} as const;

const moneySplit = { at_couriers: balance, at_chiefs: balance, handed: balance };

const totalsSchema = aliases(
  MONEY_ALIASES,
  z.object({ revenue: num, ...moneySplit, addresses: num, chief_fee: num, chief_fee_paid: optNum }),
);

const filialSchema = flattenRef(
  "filial",
  withFilialCode(
    aliases(
      { ...MONEY_ALIASES, id: ["filial_id"], name: ["filial_name"], orders_delivered: ["delivered"] },
      z.object({
        id: num,
        code: str,
        name: str,
        is_main: z.boolean().default(false),
        orders_delivered: num,
        revenue: num,
        ...moneySplit,
        addresses: num,
        chief_fee: num,
        /** To'langan haq — jonli javobda yo'q (`null` → «—»). */
        chief_fee_paid: optNum,
      }),
    ),
  ),
);

const chiefFilialSchema = flattenRef(
  "filial",
  withFilialCode(
    aliases(
      {
        fee: ["chief_fee"],
        fee_paid: ["chief_fee_paid"],
        collected: ["cash_accepted", "revenue"],
        handed: ["handed_over"],
        pending: ["outstanding"],
      },
      z.object({
        filial_id: num,
        filial_code: str,
        addresses: num,
        fee: num,
        /** To'langan haq — jonli javobda yo'q. */
        fee_paid: optNum,
        /** Bosh kuryer kuryerlardan qabul qilgan pul (`cash_accepted`). */
        collected: num,
        handed: num,
        /** Hali filialga yetmagan pul (kuryerda + bosh kuryerda). */
        pending: num,
      }),
    ),
    "filial_code",
    "filial_name",
  ),
);

/** Jonli javobda bosh kuryer `seat_id` bilan keladi — u kalit sifatida `sklad_id` o'rnida. */
const chiefSchema = aliases(
  { sklad_id: ["seat_id"], chief_name: ["full_name"] },
  z.object({
    sklad_id: num,
    sklad_name: str,
    chief_name: str,
    regions: list(z.string()),
    by_filial: list(chiefFilialSchema),
  }),
);

/**
 * Topshiriq. Jonli javobda `status` (`pending | confirmed | disputed …`) bor, `on_time` yo'q —
 * `disputed` va `pending` «vaqtida emas» deb o'qiladi.
 */
const handoverSchema = flattenRef(
  "chief",
  flattenRef(
    "filial",
    withFilialCode(
      withDefaults(
        (raw) => ({
          on_time: typeof raw.status === "string" ? !["pending", "disputed"].includes(raw.status) : true,
          sklad_id: raw.chief_seat_id,
          chief_name: raw.chief_full_name,
        }),
        z.object({
          id: num,
          date: str,
          sklad_id: num,
          chief_name: str,
          filial_id: num,
          filial_code: str,
          addresses: num,
          amount: num,
          on_time: z.boolean().default(true),
        }),
      ),
      "filial_code",
      "filial_name",
    ),
  ),
);

const regionSchema = aliases(
  { code: ["region"], money: ["revenue"], cancelled: ["otkaz"] },
  z.object({ code: str, sold: num, delivered: num, cancelled: num, money: num }),
);

/**
 * Jonli javobda filial va jami darajasida manzil soni, haq va manzil narxi yo'q — ular
 * `chiefs[].by_filial[]` (bosh kuryer × filial) dan yig'iladi; narx = haq ÷ manzil.
 */
const deriveFromChiefs = (raw: unknown): unknown => {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const body = raw as Record<string, unknown>;
  const cells = (Array.isArray(body.chiefs) ? body.chiefs : []).flatMap((chief: unknown) => {
    const rows =
      typeof chief === "object" && chief !== null ? (chief as { by_filial?: unknown }).by_filial : [];
    return Array.isArray(rows) ? (rows as unknown[]) : [];
  });
  if (cells.length === 0) return raw;
  const cellFilial = (cell: unknown): number | null => {
    if (typeof cell !== "object" || cell === null) return null;
    const row = cell as { filial?: unknown; filial_id?: unknown };
    const ref =
      typeof row.filial === "object" && row.filial !== null
        ? (row.filial as { id?: unknown }).id
        : row.filial_id;
    return toNumber(ref);
  };
  const sum = (key: "addresses" | "fee", filialId?: number) =>
    cells.reduce<number>((total, cell) => {
      if (filialId !== undefined && cellFilial(cell) !== filialId) return total;
      return total + (toNumber((cell as Record<string, unknown>)[key]) ?? 0);
    }, 0);
  const filialRows = Array.isArray(body.by_filial ?? body.filials)
    ? ((body.by_filial ?? body.filials) as unknown[])
    : [];
  const totals = (typeof body.totals === "object" && body.totals !== null ? body.totals : {}) as Record<
    string,
    unknown
  >;
  const addresses = sum("addresses");
  return {
    ...body,
    address_rate: body.address_rate ?? (addresses > 0 ? Math.round(sum("fee") / addresses) : null),
    totals: { addresses, chief_fee: sum("fee"), ...totals },
    [body.by_filial ? "by_filial" : "filials"]: filialRows.map((row) => {
      const id = cellFilial({
        filial: (row as { filial?: unknown }).filial,
        filial_id: (row as { id?: unknown }).id,
      });
      return id === null
        ? row
        : { addresses: sum("addresses", id), chief_fee: sum("fee", id), ...(row as object) };
    }),
  };
};

export const financeSchema = z.preprocess(
  deriveFromChiefs,
  aliases(
    { filials: ["by_filial"] },
    z.object({
      /** Bir manzil narxi — hamma filial uchun bitta (jonli javobda yo'q). */
      address_rate: num,
      totals: z.preprocess((raw) => raw ?? {}, totalsSchema),
      filials: list(filialSchema),
      chiefs: list(chiefSchema),
      handovers: list(handoverSchema),
      regions: list(regionSchema),
    }),
  ),
);

export type Finance = Camelized<z.infer<typeof financeSchema>>;
export type FinanceFilial = Finance["filials"][number];
export type ChiefAccount = Finance["chiefs"][number];
export type Handover = Finance["handovers"][number];
export type RegionMoney = Finance["regions"][number];
