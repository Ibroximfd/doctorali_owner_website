import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import {
  aliases,
  flattenRef,
  list,
  num,
  numbers,
  optNum,
  str,
  withDefaults,
  withFilialCode,
} from "@/shared/lib/lenient";

/**
 * «Ilova» — `GET /api/owner/app/v2/` (javob B-14): ilova zakazlari, DAU/MAU, operator referali
 * (`referred_by`, `tracked: true`). Ilova = mehrigiyo + sino_ai. Aniq shakl hujjatda yo'q — o'qish
 * chidamli (`shared/lib/lenient`); javobda yo'q bo'lim — `null` (blok «backend kutilmoqda»).
 */

export const APP_ORDER_STATUSES = ["pending", "confirmed", "in_transit", "delivered", "cancelled"] as const;
export type AppOrderStatus = (typeof APP_ORDER_STATUSES)[number];

const statusesSchema = z.preprocess(
  (raw) => raw ?? {},
  aliases(
    { cancelled: ["canceled", "otkaz"], in_transit: ["shipping"] },
    z.object({ pending: num, confirmed: num, in_transit: num, delivered: num, cancelled: num }),
  ),
);

/** Holatlar yig'indisi — jonli javobda `total` yo'q. */
const statusTotal = (raw: unknown): number =>
  typeof raw === "object" && raw !== null
    ? Object.values(raw).reduce<number>((sum, value) => sum + (typeof value === "number" ? value : 0), 0)
    : 0;

/** Filial qatori: jonli javobda `{id, name, statuses:{…}}` — tekis maydonlarga yoyiladi. */
const appFilialSchema = withFilialCode(
  z.preprocess(
    (raw) => {
      if (typeof raw !== "object" || raw === null || !("statuses" in raw)) return raw;
      const row = raw as Record<string, unknown> & { statuses: Record<string, unknown> };
      return {
        ...row.statuses,
        ...row,
        cancelled: row.cancelled ?? row.statuses.cancelled,
        delivered: row.delivered ?? row.statuses.delivered,
        total: row.total ?? statusTotal(row.statuses),
      };
    },
    aliases(
      { total: ["orders"] },
      z.object({
        id: num,
        code: str,
        name: str,
        total: num,
        delivered: num,
        cancelled: num,
        revenue: optNum,
      }),
    ),
  ),
);

/**
 * `total` = kutilmoqda + sotilgan (tasdiqlangandan boshlab). Jonli javob: `{totals:{…holatlar},
 * by_filial}` — tushum va trend yo'q (0 va bo'sh).
 */
const appOrdersSchema = withDefaults(
  (raw) => ({ total: statusTotal(raw.totals ?? raw.statuses) }),
  aliases(
    { statuses: ["totals", "by_status"], filials: ["by_filial"] },
    z.object({
      total: num,
      /** Ilova zakazlari puli — `app/v2/` da yo'q (savol B-20): `null` → «—». */
      revenue: optNum,
      statuses: statusesSchema,
      trend: z.preprocess(
        (raw) => raw ?? {},
        z.object({ labels: list(z.string()), total: numbers("total"), delivered: numbers("delivered") }),
      ),
      filials: list(appFilialSchema),
    }),
  ),
);
export type AppOrders = Camelized<z.infer<typeof appOrdersSchema>>;
export type AppFilialOrders = AppOrders["filials"][number];

/** Jami, davrda yangi, DAU (o'rtacha kunlik), MAU (30 kun). */
const appUsersSchema = aliases(
  { users_total: ["total"], new_users: ["new_in_period"] },
  z.object({
    users_total: num,
    new_users: num,
    dau: num,
    mau: num,
    trend: z.preprocess(
      (raw) => raw ?? {},
      z.object({ labels: list(z.string()), dau: numbers("dau"), mau: numbers("mau") }),
    ),
  }),
);
export type AppUsers = Camelized<z.infer<typeof appUsersSchema>>;

/** Operator ilovaga olib kirgan foydalanuvchilar (`referred_by`). */
const appOperatorSchema = flattenRef(
  "filial",
  withFilialCode(
    aliases(
      {
        invited: ["referred", "users", "invited_users"],
        ordered: ["orders", "ordered_users"],
        full_name: ["name"],
      },
      z.object({
        id: num,
        full_name: str,
        filial_id: num,
        filial_code: str,
        filial_name: str,
        invited: num,
        ordered: num,
      }),
    ),
    "filial_code",
    "filial_name",
  ),
);
export type AppOperator = Camelized<z.infer<typeof appOperatorSchema>>;

/** Bo'lim javobda bo'lmasa — `null`. */
const section = <Shape extends z.ZodTypeAny>(schema: Shape) =>
  z.preprocess((raw) => (raw === undefined ? null : raw), schema.nullable());

/** Jonli javob: `referrals: {tracked, operators: []}` — ro'yxat ichkarida. `tracked:false` — kuzatilmaydi. */
const referralsToOperators = (raw: unknown): unknown => {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("referrals" in raw)) return raw;
  const { referrals, ...rest } = raw as { referrals: unknown } & Record<string, unknown>;
  if (rest.operators !== undefined) return raw;
  if (typeof referrals === "object" && referrals !== null && !Array.isArray(referrals)) {
    const box = referrals as { tracked?: unknown; operators?: unknown };
    return { ...rest, operators: box.tracked === false ? null : (box.operators ?? null) };
  }
  return { ...rest, operators: referrals };
};

export const appV2Schema = z.preprocess(
  referralsToOperators,
  aliases(
    { users: ["audience"] },
    z.object({
      orders: section(appOrdersSchema),
      users: section(appUsersSchema),
      operators: section(z.array(appOperatorSchema)),
    }),
  ),
);
export type AppV2 = Camelized<z.infer<typeof appV2Schema>>;
