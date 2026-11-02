import type { RegionCode } from "@/shared/config/regions";

import { envelope, type MockContext } from "../engine";
import { AVG_CHECK } from "../structure-v2";
import type { MockHandler } from "../types";
import { operatorsOf, selectedFilials } from "../v2-metrics";

/**
 * Reytinglar — `GET /api/owner/ratings/{couriers|operators|logists}/` (API_QOLLANMA §5.r,
 * ILOVA_HOLAT §7.2–7.5). Shakl kontrakt namunasiga aynan: konvert, `data: {tab, formula,
 * summary, rows}`. Ma'lumot yo'q ko'rsatkich — `null` (bahosiz kuryer, natijasiz logist).
 * Bosh kuryer id lari (`chief_id`) — sklad namunasidagi bosh kuryerlar (301…305).
 */

const PRIOR = 5;
const STAR_KEYS = ["1", "2", "3", "4", "5"] as const;

type CourierSeed = {
  id: number;
  name: string;
  region: RegionCode;
  chief: number;
  active: boolean;
  /** 30 kunlik baholar soni: 1★ … 5★. */
  stars: readonly number[];
};

const COURIERS: readonly CourierSeed[] = [
  { id: 17, name: "Alisher Karimov", region: "fargona", chief: 301, active: true, stars: [0, 0, 1, 2, 17] },
  { id: 18, name: "Sardor Qodirov", region: "namangan", chief: 301, active: true, stars: [1, 0, 2, 5, 12] },
  {
    id: 19,
    name: "Jasur Aliyev",
    region: "toshkent_shahar",
    chief: 302,
    active: true,
    stars: [0, 1, 1, 6, 9],
  },
  { id: 20, name: "Otabek Rasulov", region: "toshkent", chief: 302, active: true, stars: [2, 2, 3, 4, 4] },
  { id: 21, name: "Nodir Yusupov", region: "samarqand", chief: 303, active: true, stars: [0, 0, 0, 1, 2] },
  { id: 22, name: "Eldor Sobirov", region: "qashqadaryo", chief: 304, active: false, stars: [1, 1, 2, 2, 3] },
  { id: 23, name: "Bahrom Nazarov", region: "buxoro", chief: 305, active: true, stars: [0, 0, 0, 0, 0] },
];

const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
const weighted = (stars: readonly number[]) => sum(stars.map((count, index) => count * (index + 1)));
const distributionOf = (stars: readonly number[]) =>
  Object.fromEntries(STAR_KEYS.map((key, index) => [key, stars[index] ?? 0]));

const couriers = (ctx: MockContext) => {
  const seeded = COURIERS.map((seed) => ({
    seed,
    stars: seed.stars.map((count) => Math.round(count * ctx.period.scale * ctx.filialShare)),
  }));
  const totals = STAR_KEYS.map((_, index) => sum(seeded.map((item) => item.stars[index] ?? 0)));
  const count = sum(totals);
  const avg = count === 0 ? null : weighted(totals) / count;

  const rows = seeded.map(({ seed, stars }) => {
    const ratings = sum(stars);
    const mean = ratings === 0 ? null : weighted(stars) / ratings;
    const delivered = Math.round((ratings * 3 + 4) * ctx.period.scale);
    return {
      courier: {
        id: seed.id,
        name: seed.name,
        chief_id: seed.chief,
        region: seed.region,
        is_active: seed.active,
      },
      score: mean === null || avg === null ? null : round((ratings * mean + PRIOR * avg) / (ratings + PRIOR)),
      rating_avg: mean === null ? null : round(mean),
      ratings_count: ratings,
      distribution: distributionOf(stars),
      delivered_orders: delivered,
      rated_share: delivered === 0 ? null : round((ratings / delivered) * 100, 1),
    };
  });

  return envelope(ctx, {
    tab: "couriers",
    formula: {
      score: {
        key: "score",
        name: "Kuryer reytingi",
        how: "(baholar_soni × o'rtacha_baho + 5 × davr_o'rtachasi) / (baholar_soni + 5) — Bayes tuzatmasi: baho kam bo'lsa davr o'rtachasiga tortiladi.",
        unit: "1–5",
        direction: "desc",
        null_when: "kuryer bu davrda bitta ham baho olmagan",
      },
      metrics: [
        {
          key: "rating_avg",
          name: "O'rtacha baho",
          how: "Mijoz qo'ygan yulduzlarning oddiy o'rtachasi (tuzatmasiz).",
          unit: "1–5",
          direction: "desc",
          null_when: "baho yo'q",
        },
        {
          key: "ratings_count",
          name: "Baholar",
          how: "Davrda qo'yilgan baholar.",
          unit: "dona",
          direction: "desc",
        },
        {
          key: "rated_share",
          name: "Baholangan ulush",
          how: "Baholangan zakazlar ÷ yetkazilgan zakazlar × 100.",
          unit: "%",
          direction: "desc",
          null_when: "yetkazilgan zakaz yo'q",
        },
      ],
    },
    summary: {
      avg: avg === null ? null : round(avg),
      count,
      distribution: distributionOf(totals),
      with_comment: Math.round(count * 0.4),
      low_count: (totals[0] ?? 0) + (totals[1] ?? 0),
      couriers: rows.filter((row) => row.score !== null).length,
    },
    rows,
  });
};

const operators = (ctx: MockContext) => {
  const rows = selectedFilials(ctx).flatMap((filial) =>
    operatorsOf(ctx, filial.id).map((row) => {
      const delivered = Math.max(0, row.sold - row.cancelled * 3);
      const finished = delivered + row.cancelled;
      return {
        operator: { id: row.id, name: row.full_name, filial_id: filial.id },
        score: finished === 0 ? null : round((delivered / finished) * 100, 1),
        orders_total: row.sold,
        orders_delivered: delivered,
        orders_cancelled: row.cancelled,
        revenue: delivered === 0 ? null : String(delivered * AVG_CHECK),
      };
    }),
  );
  const scored = rows.flatMap((row) => (row.score === null ? [] : [row.score]));
  return envelope(ctx, {
    tab: "operators",
    formula: {
      score: {
        key: "score",
        name: "Yetkazilish ulushi",
        how: "yetkazilgan / (yetkazilgan + bekor qilingan) × 100. Hali yakunlanmagan zakaz maxrajga kirmaydi.",
        unit: "%",
        direction: "desc",
        null_when: "davrda yakunlangan zakaz yo'q",
        note: "Mijoz operatorga baho bermaydi — bu sotuv natijasi, mijoz bahosi emas.",
      },
      metrics: [
        {
          key: "revenue",
          name: "Tushum",
          how: "Yetkazilgan zakazlar summasi, butun so'mda.",
          unit: "so'm",
          direction: "desc",
          null_when: "yetkazilgan zakaz yo'q",
        },
      ],
    },
    summary: {
      operators: rows.length,
      orders_total: sum(rows.map((row) => row.orders_total)),
      orders_delivered: sum(rows.map((row) => row.orders_delivered)),
      avg_score: scored.length === 0 ? null : round(sum(scored) / scored.length, 1),
    },
    rows,
  });
};

const LOGISTS = [
  { id: 4, name: "Sardor Ahmedov", filial: 1, minutes: 30, orders: 120 },
  { id: 5, name: "Malika Rustamova", filial: 1, minutes: 52, orders: 96 },
  { id: 6, name: "Oybek Sattorov", filial: 2, minutes: 41, orders: 88 },
  { id: 7, name: "Zarina Qosimova", filial: 3, minutes: 75, orders: 64 },
  { id: 8, name: "Ilhom Jo'rayev", filial: 3, minutes: 0, orders: 0 },
] as const;

const logists = (ctx: MockContext) => {
  const ids = new Set(selectedFilials(ctx).map((filial) => filial.id));
  const rows = LOGISTS.filter((logist) => ids.has(logist.filial)).map((logist) => {
    const finalized = Math.round(logist.orders * ctx.period.scale);
    const delivered = Math.round(finalized * 0.86);
    return {
      logist: { id: logist.id, name: logist.name, filial_id: logist.filial },
      score: finalized === 0 ? null : logist.minutes,
      finalized_orders: finalized,
      delivered_orders: delivered,
      cancelled_orders: finalized - delivered,
      avg_review_minutes: finalized === 0 ? null : logist.minutes,
    };
  });
  const measured = rows.filter((row) => row.score !== null);
  const measuredOrders = sum(measured.map((row) => row.finalized_orders));
  return envelope(ctx, {
    tab: "logists",
    formula: {
      score: {
        key: "score",
        name: "Tasdiqlash tezligi",
        how: "Kuryer natijasi kelgandan logist yakunlagangacha o'rtacha vaqt (finalized_at − outcome_requested_at), daqiqada.",
        unit: "daqiqa",
        direction: "asc",
        null_when: "kuryer natijasi bo'lgan zakaz yo'q",
        note: "Logistga mijoz baho bermaydi — bu ish tezligi.",
      },
      metrics: [
        {
          key: "finalized_orders",
          name: "Yakunlangan",
          how: "Logist yakunlagan zakazlar.",
          unit: "dona",
          direction: "desc",
        },
      ],
    },
    summary: {
      logists: rows.length,
      finalized_orders: sum(rows.map((row) => row.finalized_orders)),
      avg_review_minutes:
        measuredOrders === 0
          ? null
          : round(sum(measured.map((row) => (row.score ?? 0) * row.finalized_orders)) / measuredOrders, 1),
    },
    rows,
  });
};

export const ratingsHandlers: readonly MockHandler[] = [
  { method: "GET", path: "ratings/couriers/", resolve: couriers },
  { method: "GET", path: "ratings/operators/", resolve: operators },
  { method: "GET", path: "ratings/logists/", resolve: logists },
];
