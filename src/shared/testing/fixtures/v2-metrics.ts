import type { RegionCode } from "@/shared/config/regions";

import { apportion, type MockContext } from "./engine";
import {
  ADDRESS_RATE,
  AVG_CHECK,
  FILIAL_BASE,
  OPERATORS,
  REGION_WEIGHTS,
  SKLADS,
  filialsState,
  type FilialState,
} from "./structure-v2";

/**
 * Tuzilma v2 raqamlari bitta joyda hisoblanadi — Umumiy, Filiallar, Moliya, Analitika va AI
 * bir xil manbadan o'qiydi, shuning uchun bo'limlar orasida raqamlar farq qilmaydi:
 * operatorlar yig'indisi = filial; sklad × filial yig'indisi = filial moliyasi; viloyatlar = jami.
 *
 * Har zakazning manbasi bor: `source: "operator"` (call-center) yoki `"app"` (mobil ilova).
 * «Hammasi» = ikkalasining aniq yig'indisi (alohida yaxlitlanmaydi) — Moliya / Analitikadagi
 * «Ilovadan» filtri va «Ilova» bo'limi bir xil `appFlow` dan o'qiydi.
 */

export const ORDER_SOURCES = ["app", "operator"] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];
export type SourceFilter = OrderSource | "all";

/** So'rovdagi `?source=app|operator`; boshqasi — hammasi. */
export const sourceOf = (ctx: MockContext): SourceFilter => {
  const value = ctx.searchParams.get("source");
  return value === "app" || value === "operator" ? value : "all";
};

/** Ilova zakazlari operator zakazlariga nisbatan (filial bo'yicha): T1 da ilova eng faol. */
const APP_RATIO: Record<number, number> = { 1: 0.22, 2: 0.3, 3: 0.18 };

const REGION_CODES = Object.keys(REGION_WEIGHTS[1] ?? {}) as RegionCode[];
const ALL_REGIONS: readonly RegionCode[] = [
  ...new Set([...REGION_CODES, ...SKLADS.flatMap((sklad) => sklad.regions)]),
];

/** Davr bo'yicha oqim (filial ulushisiz — har filial o'z asosidan hisoblanadi). */
export const scaled = (ctx: MockContext, base30d: number): number =>
  Math.max(0, Math.round(base30d * ctx.period.scale));

export const operatorsOf = (ctx: MockContext, filialId: number) =>
  OPERATORS.filter((operator) => operator.filial === filialId).map((operator) => ({
    ...operator,
    leads: scaled(ctx, operator.leads),
    sold: scaled(ctx, operator.sold),
    cancelled: scaled(ctx, operator.cancelled),
  }));

export type FilialFlow = {
  leads: number;
  /** Liddan chiqqan sotuv (operator). Konversiya = `leadSold / leads`; ilova zakazi bunga kirmaydi. */
  leadSold: number;
  sold: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
  revenue: number;
  addresses: number;
};

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

const operatorFlow = (ctx: MockContext, filialId: number): FilialFlow => {
  const operators = operatorsOf(ctx, filialId);
  const leads = sum(operators.map((row) => row.leads));
  const sold = sum(operators.map((row) => row.sold));
  const cancelled = sum(operators.map((row) => row.cancelled));
  const inTransit = Math.min(sold - cancelled, scaled(ctx, FILIAL_BASE[filialId]?.inTransit ?? 0));
  const delivered = Math.max(0, sold - cancelled - inTransit);
  // bitta yetkazilgan zakaz = bitta manzil (bosh kuryer haqi shu bo'yicha)
  return {
    leads,
    leadSold: sold,
    sold,
    inTransit,
    delivered,
    cancelled,
    revenue: delivered * AVG_CHECK,
    addresses: delivered,
  };
};

export type AppFlow = FilialFlow & {
  /** Ilovada yaratilgan, operator hali tasdiqlamagan (sotilganga kirmaydi). */
  pending: number;
  /** Tasdiqlangan, hali yo'lga chiqmagan. */
  confirmed: number;
};

/**
 * Ilova zakazlari: lid yo'q (mijoz o'zi buyurtma beradi), shuning uchun konversiya hisoblanmaydi.
 * Holatlar: kutilmoqda → tasdiqlandi → yo'lda → yetkazildi | atkaz.
 */
export const appFlow = (ctx: MockContext, filialId: number): AppFlow => {
  const base = operatorFlow(ctx, filialId);
  const sold = Math.round(base.sold * (APP_RATIO[filialId] ?? 0));
  const cancelled = Math.round(sold * 0.06);
  const inTransit = Math.round(sold * 0.1);
  const confirmed = Math.round(sold * 0.05);
  const delivered = Math.max(0, sold - cancelled - inTransit - confirmed);
  return {
    leads: 0,
    leadSold: 0,
    sold,
    inTransit,
    delivered,
    cancelled,
    revenue: delivered * AVG_CHECK,
    addresses: delivered,
    pending: Math.round(sold * 0.07),
    confirmed,
  };
};

const addFlows = (a: FilialFlow, b: FilialFlow): FilialFlow => ({
  leads: a.leads + b.leads,
  leadSold: a.leadSold + b.leadSold,
  sold: a.sold + b.sold,
  inTransit: a.inTransit + b.inTransit,
  delivered: a.delivered + b.delivered,
  cancelled: a.cancelled + b.cancelled,
  revenue: a.revenue + b.revenue,
  addresses: a.addresses + b.addresses,
});

/** Filial oqimi tanlangan manba bo'yicha (sukut — so'rovdagi `source`). */
export const filialFlow = (
  ctx: MockContext,
  filialId: number,
  source: SourceFilter = sourceOf(ctx),
): FilialFlow => {
  if (source === "operator") return operatorFlow(ctx, filialId);
  if (source === "app") return appFlow(ctx, filialId);
  return addFlows(operatorFlow(ctx, filialId), appFlow(ctx, filialId));
};

export const pct = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;

/** Tanlangan filiallar (global filtr) — to'liq holat yozuvi bilan. */
export const selectedFilials = (ctx: MockContext): FilialState[] => {
  const ids = new Set(ctx.filials.map((filial) => filial.id));
  return filialsState().filter((filial) => ids.has(filial.id));
};

/* ---------- viloyatlar ---------- */

export type RegionFlow = { code: RegionCode; sold: number; delivered: number; cancelled: number };

export const regionFlows = (
  ctx: MockContext,
  filialId: number,
  source: SourceFilter = sourceOf(ctx),
): RegionFlow[] => {
  if (source === "all") {
    const app = regionFlows(ctx, filialId, "app");
    return regionFlows(ctx, filialId, "operator").map((row, index) => ({
      code: row.code,
      sold: row.sold + (app[index]?.sold ?? 0),
      delivered: row.delivered + (app[index]?.delivered ?? 0),
      cancelled: row.cancelled + (app[index]?.cancelled ?? 0),
    }));
  }
  const flow = filialFlow(ctx, filialId, source);
  const weights = ALL_REGIONS.map((code) => REGION_WEIGHTS[filialId]?.[code] ?? 0);
  const sold = apportion(flow.sold, weights);
  const delivered = apportion(flow.delivered, weights);
  const cancelled = apportion(flow.cancelled, weights);
  return ALL_REGIONS.map((code, index) => ({
    code,
    sold: sold[index] ?? 0,
    delivered: delivered[index] ?? 0,
    cancelled: cancelled[index] ?? 0,
  }));
};

/* ---------- pul: sklad (bosh kuryer) × filial ---------- */

/**
 * Pul qayerda: kuryerda → bosh kuryerda → filialga topshirildi. T2 bilan Janub bosh kuryeri
 * kechikmoqda (bosh kuryerda ko'p pul turibdi) — AI topilmasi shunga tayanadi.
 */
const MONEY_SPLIT = (skladId: number, filialId: number): [number, number, number] =>
  skladId === 4 && filialId === 3 ? [6, 38, 56] : [5, 8, 87];

export type ChiefFilialMoney = {
  skladId: number;
  filialId: number;
  addresses: number;
  revenue: number;
  atCouriers: number;
  atChief: number;
  handed: number;
  fee: number;
  feePaid: number;
};

export const chiefMoney = (
  ctx: MockContext,
  filialId: number,
  source: SourceFilter = sourceOf(ctx),
): ChiefFilialMoney[] => {
  if (source === "all") {
    const app = chiefMoney(ctx, filialId, "app");
    return chiefMoney(ctx, filialId, "operator").map((row, index) => {
      const other = app[index];
      return {
        ...row,
        addresses: row.addresses + (other?.addresses ?? 0),
        revenue: row.revenue + (other?.revenue ?? 0),
        atCouriers: row.atCouriers + (other?.atCouriers ?? 0),
        atChief: row.atChief + (other?.atChief ?? 0),
        handed: row.handed + (other?.handed ?? 0),
        fee: row.fee + (other?.fee ?? 0),
        feePaid: row.feePaid + (other?.feePaid ?? 0),
      };
    });
  }
  const regions = regionFlows(ctx, filialId, source);
  return SKLADS.map((sklad) => {
    const addresses = sum(
      regions.filter((region) => sklad.regions.includes(region.code)).map((region) => region.delivered),
    );
    const revenue = addresses * AVG_CHECK;
    const [atCouriers = 0, atChief = 0, handed = 0] = apportion(revenue, MONEY_SPLIT(sklad.id, filialId));
    const fee = addresses * ADDRESS_RATE;
    // haq oxirgi topshiriqdan keyin to'lanadi — taxminan to'rtdan uch qismi to'langan
    const feePaid = Math.round((fee * (filialId === 3 ? 0.6 : 0.8)) / ADDRESS_RATE) * ADDRESS_RATE;
    return { skladId: sklad.id, filialId, addresses, revenue, atCouriers, atChief, handed, fee, feePaid };
  });
};

/** Ko'rsatilgan sonli maydonlar yig'indisi. */
export const totalsOf = <Row, Key extends keyof Row>(rows: readonly Row[], keys: readonly Key[]) =>
  // `Object.fromEntries` kalit tipini yo'qotadi — kalitlar aynan `keys` dan, shuning uchun `as` xavfsiz
  Object.fromEntries(keys.map((key) => [key, sum(rows.map((row) => Number(row[key]) || 0))])) as Record<
    Key,
    number
  >;
