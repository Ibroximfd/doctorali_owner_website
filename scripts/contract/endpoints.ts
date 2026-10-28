/**
 * Frontend backenddan chaqiradigan BARCHA `GET /api/owner/*` endpointlar — yagona
 * ro'yxat. Shartnoma tekshirgichi (`npm run contract:check`) va hujjat shundan
 * foydalanadi; test har namuna endpoint shu yerda borligini kafolatlaydi.
 *
 * Sxemalar — ilovadagining o'zi: backend javobi shu yerda o'tsa, ekranda ham o'tadi.
 */
import type { z } from "zod";

import {
  activitySchema,
  candidatesSchema,
  membersSchema,
  templatesSchema,
} from "@/features/access/model/access.schema";
import {
  accountDetailSchema,
  accountsSchema,
  departmentsSchema,
  permissionsSchema,
  rolesSchema,
} from "@/features/access/model/iam.schema";
import {
  actionsResponseSchema,
  aiSummarySchema,
  autopilotSchema,
  chatSchema,
  chatsSchema,
  checksSchema,
  findingsResponseSchema,
  recommendationsSchema,
  reportsSchema as aiReportsSchema,
} from "@/features/ai/model/ai.schema";
import { alertRulesResponseSchema, alertsResponseSchema } from "@/features/alerts/model/alerts.schema";
import { userSchema } from "@/features/auth/model/auth.schema";
import {
  clinicBranchesSchema,
  clinicDoctorsSchema,
  clinicSummarySchema,
  clinicWarehouseSchema,
} from "@/features/clinic/model/clinic.schema";
import {
  cohortsSchema,
  customerRegionsSchema,
  customersSummarySchema,
  topCustomersSchema,
} from "@/features/customers/model/customers.schema";
import { doctorsSchema, doctorsSummarySchema } from "@/features/doctors/model/doctors.schema";
import {
  cashPositionSchema,
  dailyClosingsSchema,
  debtsSchema,
  expensesSchema,
  financeSummarySchema,
  liabilitiesSchema,
  paymentMixSchema,
  returnsSchema,
} from "@/features/finance/model/finance.schema";
import {
  forecastRegionsSchema,
  forecastSeriesSchema,
  forecastSummarySchema,
  stockoutsSchema,
} from "@/features/forecast/model/forecast.schema";
import {
  issueDetailSchema,
  issuesResponseSchema,
  recipientsSchema,
} from "@/features/issues/model/issues.schema";
import {
  attemptReasonsSchema,
  courierDetailSchema,
  couriersSchema,
  handoversSchema,
  liveSchema,
  logisticsSummarySchema,
  regionDeliverySchema,
  transfersSchema,
} from "@/features/logistics/model/logistics.schema";
import {
  appConsultationsSchema,
  appDevicesSchema,
  appEngagementSchema,
  appFunnelsSchema,
  appLoyaltySchema,
  appSummarySchema,
  doctorAppSchema,
} from "@/features/mobile-app/model/mobile-app.schema";
import {
  orderDetailSchema,
  ordersBreakdownSchema,
  ordersFunnelSchema,
  ordersHeatmapSchema,
  ordersListSchema,
  ordersSummarySchema,
  stageDurationsSchema,
  stuckOrdersSchema,
} from "@/features/orders/model/orders.schema";
import { feedSchema, overviewSchema } from "@/features/overview/model/overview.schema";
import { regionLiveSchema, regionsSchema } from "@/features/regions/model/regions.schema";
import { leaderboardSchema, profileSchema, teamsSchema } from "@/features/staff/model/staff.schema";
import { productsSchema } from "@/features/products/model/products.schema";
import {
  digestSchema,
  exportStatusSchema,
  exportsResponseSchema,
} from "@/features/reports/model/reports.schema";
import {
  leadSourcesSchema,
  leadsFunnelSchema,
  operatorDetailSchema,
  operatorsSchema,
  salesCallsSchema,
  salesFilialsSchema,
  salesFilialsTrendSchema,
  salesRatingsSchema,
  salesSummarySchema,
} from "@/features/sales/model/sales.schema";
import {
  accessResponseSchema,
  sessionsResponseSchema,
  targetsSchema,
} from "@/features/settings/model/settings.schema";
import {
  agingSchema,
  b2bSchema,
  regionSettlementsSchema,
  settlementsSummarySchema,
} from "@/features/settlements/model/settlements.schema";
import { auditSchema, healthSchema, syncSchema } from "@/features/system/model/system.schema";
import {
  salesMixSchema,
  stockSchema,
  warehouseSummarySchema,
  warehousesSchema,
} from "@/features/warehouse/model/warehouse.schema";
import { timeseriesSchema } from "@/shared/lib/envelope";
import { metaSchema } from "@/shared/meta/meta.schema";

export type Query = Record<string, string>;

/** Yo'ldagi `:id` qayerdan olinadi: boshqa endpoint javobidan birinchi yozuv. */
type IdSource = { path: string; query: Query; pick: (json: unknown) => string[] };

export type ContractEndpoint = {
  section: string;
  /** `/api/owner/` ga nisbatan, `/` bilan tugaydi. */
  path: string;
  /** `envelope` — `{period, compare, filials, generated_at, freshness, data}`; `plain` — konvertsiz. */
  shape: "envelope" | "plain";
  schema: z.ZodTypeAny;
  /** Global filtr (`period`, `date_from`, `date_to`, `compare`, `filial`) qabul qiladimi. */
  scoped: boolean;
  /** Filtrdan tashqari doimiy parametrlar (frontend aynan shularni yuboradi). */
  query?: Query;
  /** Bir nechta qiymat bilan chaqiriladigan parametr (har biri alohida tekshiriladi). */
  variants?: Query[];
  idSource?: IdSource;
  note?: string;
};

const SCOPED = { shape: "envelope", scoped: true } as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Kartalar bitta yozuvda emas, bir nechtasida tekshiriladi — bo'sh maydonlar har yozuvda boshqacha. */
export const DETAIL_SAMPLE_SIZE = 25;

/** Konvert ichidagi ro'yxat yoki `{results}` dagi yozuvlarning `id` lari (ko'pi bilan `DETAIL_SAMPLE_SIZE`). */
const firstId =
  (field = "id") =>
  (json: unknown): string[] => {
    const holder = isRecord(json) && "data" in json ? json.data : json;
    const list: unknown = Array.isArray(holder) ? holder : isRecord(holder) ? holder.results : undefined;
    if (!Array.isArray(list)) return [];
    return list.slice(0, DETAIL_SAMPLE_SIZE).flatMap((item: unknown) => {
      const id = isRecord(item) ? item[field] : undefined;
      return typeof id === "string" || typeof id === "number" ? [String(id)] : [];
    });
  };

const THIS_MONTH = new Date().toISOString().slice(0, 7);

export const CONTRACT_ENDPOINTS: readonly ContractEndpoint[] = [
  /* ---------- umumiy ---------- */
  {
    section: "Umumiy",
    path: "meta/",
    shape: "plain",
    schema: metaSchema,
    scoped: false,
    note: "filiallar, hududlar, lug'atlar; kunda 1 marta keshlanadi",
  },
  { section: "Umumiy", path: "me/", shape: "plain", schema: userSchema, scoped: false },
  { section: "Umumiy", path: "overview/", ...SCOPED, schema: overviewSchema },
  {
    section: "Umumiy",
    path: "overview/timeseries/",
    ...SCOPED,
    schema: timeseriesSchema,
    query: { metric: "revenue", split: "channel" },
  },
  {
    section: "Umumiy",
    path: "feed/",
    shape: "plain",
    schema: feedSchema,
    scoped: false,
    query: { limit: "30" },
    note: "jonli lenta; har 15 s so'raladi (WS bo'lsa — jonli)",
  },

  /* ---------- buyurtmalar ---------- */
  { section: "Buyurtmalar", path: "orders/summary/", ...SCOPED, schema: ordersSummarySchema },
  { section: "Buyurtmalar", path: "orders/funnel/", ...SCOPED, schema: ordersFunnelSchema },
  { section: "Buyurtmalar", path: "orders/timeseries/", ...SCOPED, schema: timeseriesSchema },
  {
    section: "Buyurtmalar",
    path: "orders/breakdown/",
    ...SCOPED,
    schema: ordersBreakdownSchema,
    variants: [{ by: "source" }, { by: "region" }, { by: "cancel_reason" }, { by: "confirmation_channel" }],
  },
  { section: "Buyurtmalar", path: "orders/stage-durations/", ...SCOPED, schema: stageDurationsSchema },
  { section: "Buyurtmalar", path: "orders/heatmap/", ...SCOPED, schema: ordersHeatmapSchema },
  {
    section: "Buyurtmalar",
    path: "orders/stuck/",
    shape: "envelope",
    scoped: false,
    schema: stuckOrdersSchema,
    note: "hozirgi holat: faqat `filial` qabul qiladi, davr yo'q",
  },
  {
    section: "Buyurtmalar",
    path: "orders/",
    shape: "plain",
    scoped: true,
    schema: ordersListSchema,
    query: { page: "1", page_size: "10" },
    variants: [{}, { status: "shipping" }, { search: "DA-18" }],
    note: "`status` ∈ pending|confirmed|shipping|delivered|cancelled; `search` — raqam, ism yoki telefon",
  },
  {
    section: "Buyurtmalar",
    path: "orders/:id/",
    shape: "plain",
    scoped: false,
    schema: orderDetailSchema,
    idSource: { path: "orders/", query: { period: "year", page: "1", page_size: "25" }, pick: firstId() },
    note: "yo'q → 404 `order_not_found`",
  },
  {
    section: "Buyurtmalar",
    path: "orders/app-funnels/",
    ...SCOPED,
    schema: appFunnelsSchema,
    note: "Mobil ilova ekranida ko'rsatiladi",
  },

  /* ---------- moliya ---------- */
  { section: "Moliya", path: "finance/summary/", ...SCOPED, schema: financeSummarySchema },
  {
    section: "Moliya",
    path: "finance/cashflow/",
    ...SCOPED,
    schema: timeseriesSchema,
    variants: [{ group: "day" }, { group: "week" }, { group: "month" }],
    note: "`group` MAJBURIY (`day`/`week`/`month`) — frontend davr uzunligiga qarab yuboradi",
  },
  {
    section: "Moliya",
    path: "finance/cash-position/",
    ...SCOPED,
    schema: cashPositionSchema,
    note: "hozirgi holat; davr e'tiborsiz",
  },
  { section: "Moliya", path: "finance/payment-mix/", ...SCOPED, schema: paymentMixSchema },
  { section: "Moliya", path: "finance/expenses/", ...SCOPED, schema: expensesSchema },
  { section: "Moliya", path: "finance/liabilities/", ...SCOPED, schema: liabilitiesSchema },
  { section: "Moliya", path: "finance/returns/", ...SCOPED, schema: returnsSchema },
  { section: "Moliya", path: "finance/debts/", ...SCOPED, schema: debtsSchema },
  { section: "Moliya", path: "finance/daily-closings/", ...SCOPED, schema: dailyClosingsSchema },

  /* ---------- klinika ---------- */
  { section: "Klinika", path: "clinic/summary/", ...SCOPED, schema: clinicSummarySchema },
  {
    section: "Klinika",
    path: "clinic/timeseries/",
    ...SCOPED,
    schema: timeseriesSchema,
    query: { metric: "revenue" },
  },
  { section: "Klinika", path: "clinic/branches/", ...SCOPED, schema: clinicBranchesSchema },
  { section: "Klinika", path: "clinic/doctors/", ...SCOPED, schema: clinicDoctorsSchema },
  { section: "Klinika", path: "clinic/warehouse/", ...SCOPED, schema: clinicWarehouseSchema },

  /* ---------- yetkazib berish ---------- */
  { section: "Yetkazib berish", path: "logistics/summary/", ...SCOPED, schema: logisticsSummarySchema },
  { section: "Yetkazib berish", path: "logistics/couriers/", ...SCOPED, schema: couriersSchema },
  {
    section: "Yetkazib berish",
    path: "logistics/couriers/:id/",
    ...SCOPED,
    schema: courierDetailSchema,
    idSource: { path: "logistics/couriers/", query: { period: "30d" }, pick: firstId() },
    note: "yo'q → 404 `courier_not_found`",
  },
  { section: "Yetkazib berish", path: "logistics/timeseries/", ...SCOPED, schema: timeseriesSchema },
  { section: "Yetkazib berish", path: "logistics/regions/", ...SCOPED, schema: regionDeliverySchema },
  { section: "Yetkazib berish", path: "logistics/attempt-reasons/", ...SCOPED, schema: attemptReasonsSchema },
  { section: "Yetkazib berish", path: "logistics/transfers/", ...SCOPED, schema: transfersSchema },

  /* ---------- sotuv jamoasi ---------- */
  { section: "Sotuv jamoasi", path: "sales/summary/", ...SCOPED, schema: salesSummarySchema },
  {
    section: "Sotuv jamoasi",
    path: "sales/filials/",
    ...SCOPED,
    schema: salesFilialsSchema,
    note: "`filial` e'tiborsiz — har doim barcha filiallar",
  },
  {
    section: "Sotuv jamoasi",
    path: "sales/filials/timeseries/",
    ...SCOPED,
    schema: salesFilialsTrendSchema,
    note: "`filial` e'tiborsiz; `series[].key` = filial id",
  },
  { section: "Sotuv jamoasi", path: "sales/operators/", ...SCOPED, schema: operatorsSchema },
  {
    section: "Sotuv jamoasi",
    path: "sales/operators/:id/",
    ...SCOPED,
    schema: operatorDetailSchema,
    idSource: { path: "sales/operators/", query: { period: "30d" }, pick: firstId() },
    note: "yo'q → 404 `operator_not_found`",
  },
  { section: "Sotuv jamoasi", path: "sales/leads-funnel/", ...SCOPED, schema: leadsFunnelSchema },
  { section: "Sotuv jamoasi", path: "sales/lead-sources/", ...SCOPED, schema: leadSourcesSchema },
  { section: "Sotuv jamoasi", path: "sales/calls/", ...SCOPED, schema: salesCallsSchema },
  { section: "Sotuv jamoasi", path: "sales/ratings/", ...SCOPED, schema: salesRatingsSchema },

  /* ---------- mobil ilova ---------- */
  { section: "Mobil ilova", path: "app/summary/", ...SCOPED, schema: appSummarySchema },
  {
    section: "Mobil ilova",
    path: "app/timeseries/",
    ...SCOPED,
    schema: timeseriesSchema,
    variants: [{ metric: "active_users" }, { metric: "new_users" }],
  },
  { section: "Mobil ilova", path: "app/devices/", ...SCOPED, schema: appDevicesSchema },
  { section: "Mobil ilova", path: "app/consultations/", ...SCOPED, schema: appConsultationsSchema },
  { section: "Mobil ilova", path: "app/engagement/", ...SCOPED, schema: appEngagementSchema },
  { section: "Mobil ilova", path: "app/loyalty/", ...SCOPED, schema: appLoyaltySchema },
  { section: "Mobil ilova", path: "app/doctor-app/", ...SCOPED, schema: doctorAppSchema },

  /* ---------- mahsulotlar, mijozlar, shifokorlar ---------- */
  { section: "Mahsulotlar", path: "products/", ...SCOPED, schema: productsSchema },
  { section: "Mijozlar", path: "customers/summary/", ...SCOPED, schema: customersSummarySchema },
  { section: "Mijozlar", path: "customers/timeseries/", ...SCOPED, schema: timeseriesSchema },
  { section: "Mijozlar", path: "customers/cohorts/", ...SCOPED, schema: cohortsSchema },
  { section: "Mijozlar", path: "customers/top/", ...SCOPED, schema: topCustomersSchema },
  { section: "Mijozlar", path: "customers/regions/", ...SCOPED, schema: customerRegionsSchema },
  { section: "Shifokorlar", path: "doctors/summary/", ...SCOPED, schema: doctorsSummarySchema },
  { section: "Shifokorlar", path: "doctors/", ...SCOPED, schema: doctorsSchema },

  /* ---------- signallar, hisobotlar, sozlamalar ---------- */
  { section: "Signallar", path: "alerts/", shape: "plain", scoped: false, schema: alertsResponseSchema },
  {
    section: "Signallar",
    path: "alerts/rules/",
    shape: "plain",
    scoped: false,
    schema: alertRulesResponseSchema,
  },
  {
    section: "Hisobotlar",
    path: "reports/exports/",
    shape: "plain",
    scoped: false,
    schema: exportsResponseSchema,
  },
  {
    section: "Hisobotlar",
    path: "reports/export/:id/",
    shape: "plain",
    scoped: false,
    schema: exportStatusSchema,
    idSource: { path: "reports/exports/", query: {}, pick: firstId("job_id") },
    note: "yo'q → 404 `export_not_found`; tarix bo'sh bo'lsa tekshiruv o'tkazib yuboriladi",
  },
  { section: "Hisobotlar", path: "reports/digest/", shape: "plain", scoped: false, schema: digestSchema },
  {
    section: "Sozlamalar",
    path: "targets/",
    shape: "plain",
    scoped: false,
    schema: targetsSchema,
    query: { month: THIS_MONTH },
  },
  { section: "Sozlamalar", path: "sessions/", shape: "plain", scoped: false, schema: sessionsResponseSchema },
  {
    section: "Sozlamalar",
    path: "settings/access/",
    shape: "plain",
    scoped: false,
    schema: accessResponseSchema,
  },

  /* ---------- v2 (`07_BACKEND_TZ_V2`): ERP integratsiyasi, AI, ruxsatlar ---------- */
  {
    section: "Hududlar",
    path: "regions/",
    ...SCOPED,
    schema: regionsSchema,
    note: "xarita: sotuv (davr) + ombor va kuryerlar (hozir)",
  },
  {
    section: "Hududlar",
    path: "regions/:id/live/",
    shape: "envelope",
    scoped: false,
    schema: regionLiveSchema,
    idSource: { path: "regions/", query: { period: "30d" }, pick: firstId("region") },
    note: "viloyat ichi: omborlar, kuryerlar (lat/lng, vazifa, naqd); 15 s da so'raladi",
  },
  { section: "Ombor", path: "warehouse/summary/", ...SCOPED, schema: warehouseSummarySchema },
  { section: "Ombor", path: "warehouse/warehouses/", ...SCOPED, schema: warehousesSchema },
  {
    section: "Ombor",
    path: "warehouse/stock/",
    ...SCOPED,
    schema: stockSchema,
    note: "`warehouse=<id>` — bitta ombor (ombor kartasi)",
  },
  { section: "Ombor", path: "warehouse/movements/", ...SCOPED, schema: timeseriesSchema },
  {
    section: "Ombor",
    path: "warehouse/sales-mix/",
    ...SCOPED,
    schema: salesMixSchema,
    note: "to'liq narx · chegirma · sovg'a",
  },
  {
    section: "Xodimlar",
    path: "staff/leaderboard/",
    ...SCOPED,
    schema: leaderboardSchema,
    variants: [
      { role: "operator" },
      { role: "admin" },
      { role: "courier" },
      { role: "warehouse" },
      { role: "logist" },
    ],
  },
  { section: "Xodimlar", path: "staff/teams/", ...SCOPED, schema: teamsSchema, query: { role: "operator" } },
  {
    section: "Xodimlar",
    path: "staff/:id/",
    ...SCOPED,
    schema: profileSchema,
    idSource: {
      path: "staff/leaderboard/",
      query: { period: "30d", role: "operator" },
      pick: (json) => {
        const holder =
          typeof json === "object" && json !== null && "data" in json
            ? (json as { data: unknown }).data
            : null;
        const rows =
          typeof holder === "object" && holder !== null && "rows" in holder
            ? (holder as { rows: unknown }).rows
            : [];
        return Array.isArray(rows)
          ? rows
              .slice(0, 5)
              .flatMap((row: unknown) =>
                typeof row === "object" && row !== null && "id" in row
                  ? [String((row as { id: unknown }).id)]
                  : [],
              )
          : [];
      },
    },
  },
  { section: "Hisob-kitob", path: "settlements/summary/", ...SCOPED, schema: settlementsSummarySchema },
  { section: "Hisob-kitob", path: "settlements/regions/", ...SCOPED, schema: regionSettlementsSchema },
  { section: "Hisob-kitob", path: "settlements/aging/", ...SCOPED, schema: agingSchema },
  { section: "Hisob-kitob", path: "settlements/b2b/", ...SCOPED, schema: b2bSchema },
  {
    section: "Yetkazib berish",
    path: "logistics/live/",
    shape: "envelope",
    scoped: false,
    schema: liveSchema,
    note: "hozirgi holat; faqat `filial`; 15 s da so'raladi",
  },
  {
    section: "Yetkazib berish",
    path: "logistics/handovers/",
    shape: "envelope",
    scoped: false,
    schema: handoversSchema,
  },
  {
    section: "Muammolar",
    path: "issues/",
    shape: "plain",
    scoped: false,
    schema: issuesResponseSchema,
    variants: [{ status: "open" }, { status: "all" }],
  },
  {
    section: "Muammolar",
    path: "issues/:id/",
    shape: "plain",
    scoped: false,
    schema: issueDetailSchema,
    idSource: { path: "issues/", query: { status: "all" }, pick: firstId() },
  },
  {
    section: "Muammolar",
    path: "issues/recipients/",
    shape: "plain",
    scoped: false,
    schema: recipientsSchema,
    variants: [{ domain: "warehouse" }, { domain: "logistics" }, { domain: "finance" }],
  },
  {
    section: "Prognoz",
    path: "forecast/summary/",
    shape: "envelope",
    scoped: false,
    schema: forecastSummarySchema,
    variants: [{ horizon: "7" }, { horizon: "30" }, { horizon: "90" }],
  },
  {
    section: "Prognoz",
    path: "forecast/timeseries/",
    shape: "envelope",
    scoped: false,
    schema: forecastSeriesSchema,
    variants: [
      { horizon: "30", metric: "revenue" },
      { horizon: "30", metric: "orders" },
    ],
  },
  {
    section: "Prognoz",
    path: "forecast/stockouts/",
    shape: "envelope",
    scoped: false,
    schema: stockoutsSchema,
    query: { horizon: "30" },
  },
  {
    section: "Prognoz",
    path: "forecast/regions/",
    shape: "envelope",
    scoped: false,
    schema: forecastRegionsSchema,
    query: { horizon: "30" },
  },
  { section: "Tizim", path: "system/health/", shape: "plain", scoped: false, schema: healthSchema },
  { section: "Tizim", path: "system/sync/", shape: "plain", scoped: false, schema: syncSchema },
  {
    section: "Tizim",
    path: "system/audit/",
    shape: "plain",
    scoped: false,
    schema: auditSchema,
    query: { page: "1" },
  },
  { section: "AI tahlil", path: "ai/summary/", shape: "plain", scoped: false, schema: aiSummarySchema },
  {
    section: "AI tahlil",
    path: "ai/findings/",
    shape: "plain",
    scoped: false,
    schema: findingsResponseSchema,
    variants: [{ status: "open" }, { status: "all" }],
  },
  {
    section: "AI tahlil",
    path: "ai/actions/",
    shape: "plain",
    scoped: false,
    schema: actionsResponseSchema,
    variants: [{ status: "proposed" }, { status: "all" }],
    note: "AI avto-tuzatish (`08` §B)",
  },
  { section: "AI tahlil", path: "ai/autopilot/", shape: "plain", scoped: false, schema: autopilotSchema },
  { section: "AI tahlil", path: "ai/checks/", shape: "plain", scoped: false, schema: checksSchema },
  { section: "AI tahlil", path: "ai/reports/", shape: "plain", scoped: false, schema: aiReportsSchema },
  {
    section: "AI tahlil",
    path: "ai/recommendations/",
    shape: "plain",
    scoped: false,
    schema: recommendationsSchema,
  },
  { section: "AI tahlil", path: "ai/chats/", shape: "plain", scoped: false, schema: chatsSchema },
  {
    section: "AI tahlil",
    path: "ai/chats/:id/",
    shape: "plain",
    scoped: false,
    schema: chatSchema,
    idSource: { path: "ai/chats/", query: {}, pick: firstId() },
    note: "javob tayyorlanayotganda 1,5 s da so'raladi; chat bo'lmasa tekshiruv o'tkazib yuboriladi",
  },
  {
    section: "Ruxsatlar",
    path: "access/members/",
    shape: "plain",
    scoped: false,
    schema: membersSchema,
    query: { status: "all" },
    note: "faqat `owner`",
  },
  {
    section: "Ruxsatlar",
    path: "access/candidates/",
    shape: "plain",
    scoped: false,
    schema: candidatesSchema,
    query: { search: "" },
  },
  { section: "Ruxsatlar", path: "access/templates/", shape: "plain", scoped: false, schema: templatesSchema },
  {
    section: "Ruxsatlar",
    path: "access/activity/",
    shape: "plain",
    scoped: false,
    schema: activitySchema,
    query: { limit: "50" },
  },
  {
    section: "Akkauntlar (IAM)",
    path: "iam/departments/",
    shape: "plain",
    scoped: false,
    schema: departmentsSchema,
    note: "`08` §A",
  },
  {
    section: "Akkauntlar (IAM)",
    path: "iam/permissions/",
    shape: "plain",
    scoped: false,
    schema: permissionsSchema,
  },
  { section: "Akkauntlar (IAM)", path: "iam/roles/", shape: "plain", scoped: false, schema: rolesSchema },
  {
    section: "Akkauntlar (IAM)",
    path: "iam/accounts/",
    shape: "plain",
    scoped: false,
    schema: accountsSchema,
    query: { search: "" },
  },
  {
    section: "Akkauntlar (IAM)",
    path: "iam/accounts/:id/",
    shape: "plain",
    scoped: false,
    schema: accountDetailSchema,
    idSource: { path: "iam/accounts/", query: { search: "" }, pick: firstId() },
  },
];

/** Global filtrning frontend yuboradigan tipik holatlari (`npm run contract:check -- --full`). */
export const SCOPE_MATRIX: readonly Query[] = [
  { period: "today", compare: "previous" },
  { period: "yesterday", compare: "previous" },
  { period: "7d", compare: "previous" },
  { period: "30d", compare: "previous" },
  { period: "month", compare: "previous" },
  { period: "prev_month", compare: "yoy" },
  { period: "year", compare: "none" },
  { period: "custom", date_from: "2026-07-01", date_to: "2026-09-28", compare: "previous" },
  { period: "30d", compare: "previous", filial: "1" },
  { period: "30d", compare: "previous", filial: "1,2" },
];

export const DEFAULT_SCOPE: Query = { period: "30d", compare: "previous" };
