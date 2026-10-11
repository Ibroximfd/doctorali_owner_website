import type { Timeseries } from "@/shared/lib/envelope";

import type {
  AppConsultations,
  AppDevices,
  AppEngagement,
  AppFunnels,
  AppLoyalty,
  AppTimeseriesMetric,
  DoctorApp,
} from "./mobile-app.schema";

/** `part` ning `whole` dagi ulushi, foizda (1 kasr). Bo'luvchi nol bo'lsa — 0. */
export const shareOf = (part: number, whole: number): number =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

/** Javobdan faqat so'ralgan o'lchov olinadi — ikki xil shkala bitta o'qqa tushmasin. */
export const seriesValues = (timeseries: Timeseries, metric: AppTimeseriesMetric): number[] =>
  timeseries.series.find((series) => series.key === metric)?.values ?? [];

/* ---------- qurilmalar ---------- */

export const totalPlatformUsers = (devices: AppDevices): number =>
  devices.platform.reduce((sum, row) => sum + row.users, 0);

export const isDevicesEmpty = (devices: AppDevices): boolean =>
  devices.platform.length === 0 && devices.versions.length === 0 && devices.markets.length === 0;

/**
 * Simdagi kalit → tarjima kaliti. Noma'lum qiymat (yangi platforma, til, bozor)
 * `null` qaytaradi — UI qiymatning o'zini ko'rsatadi, yiqilmaydi.
 */
const PLATFORM_KEYS: Record<string, string> = { android: "android", ios: "ios" };
const LANGUAGE_KEYS: Record<string, string> = {
  uz: "uz",
  ru: "ru",
  "uz-Cyrl": "uzCyrl",
  en: "en",
  tg: "tg",
  ar: "ar",
};
const MARKET_KEYS: Record<string, string> = { UZ: "uz", SA: "sa", INTL: "intl" };

export const platformLabelKey = (key: string): string | null => PLATFORM_KEYS[key.toLowerCase()] ?? null;
export const languageLabelKey = (key: string): string | null => LANGUAGE_KEYS[key] ?? null;
export const marketLabelKey = (key: string): string | null => MARKET_KEYS[key.toUpperCase()] ?? null;

/** Eski versiyalar bitta qatorga yig'ilib keladi (`version: "older"`). */
export const OLDER_VERSIONS_KEY = "older";

/* ---------- faollik ---------- */

/** Prototipdagi tartib. */
export const ENGAGEMENT_KEYS = [
  "aiDoctorConversations",
  "healthActiveUsers",
  "streamViewers",
  "foodScans",
  "medRemindersActive",
  "referrals",
] as const satisfies readonly (keyof AppEngagement)[];

/** Hech bir ko'rsatkich yig'ilmayotgan bo'lsa blok "bo'sh" — qator-qator "ma'lumot yo'q" emas. */
export const isEngagementEmpty = (engagement: AppEngagement): boolean =>
  ENGAGEMENT_KEYS.every((key) => engagement[key] === null);

/* ---------- voronkalar ---------- */

export type FunnelCount<Key extends string> = { key: Key; count: number };

type ConfirmStepKey = "pushSent" | "opened" | "slid" | "paymentSelected" | "confirmed";

/**
 * Ilova hali yubormayotgan bosqich (`null`) voronkadan tushiriladi — aks holda
 * «0 ga tushdi» bo'lib ko'rinardi va o'tish foizlari noto'g'ri chiqardi.
 */
export const confirmFunnelSteps = (confirm: AppFunnels["confirm"]): FunnelCount<ConfirmStepKey>[] =>
  (
    [
      { key: "pushSent", count: confirm.pushSent },
      { key: "opened", count: confirm.opened },
      { key: "slid", count: confirm.slid },
      { key: "paymentSelected", count: confirm.paymentSelected },
      { key: "confirmed", count: confirm.confirmed },
    ] as const
  ).flatMap((step) => (step.count === null ? [] : [{ key: step.key, count: step.count }]));

/**
 * Bekor qilish oqimi: 1) sabab tanladi → 2) ushlab qolish ekranini ko'rdi
 * (qolganlar + davom etganlar) → 3) sabab yozdi (davom etganlar) → bekor qildi.
 */
export const cancelFunnelSteps = (cancel: AppFunnels["cancel"]) =>
  [
    { key: "step1", count: cancel.step1 },
    { key: "step2", count: cancel.step2Kept + cancel.step2Continued },
    { key: "step3", count: cancel.step2Continued },
    { key: "cancelled", count: cancel.step3Cancelled },
  ] as const satisfies readonly FunnelCount<string>[];

/** Bekor qilishni boshlab, oxirigacha bormaganlar — oqim saqlab qolgan buyurtmalar. */
export const retainedOrders = (cancel: AppFunnels["cancel"]): { count: number; pct: number } => {
  const count = Math.max(0, cancel.step1 - cancel.step3Cancelled);
  return { count, pct: shareOf(count, cancel.step1) };
};

/* ---------- "bo'sh" holat shartlari ---------- */

export const isConsultationsEmpty = (consultations: AppConsultations): boolean =>
  consultations.created === 0 && consultations.completed === 0 && consultations.revenue === 0;

export const isLoyaltyEmpty = (loyalty: AppLoyalty): boolean =>
  [
    loyalty.pointsIssued,
    loyalty.pointsSpent,
    loyalty.pointsExpired,
    loyalty.walletBalanceTotal,
    loyalty.giftsEarned,
    loyalty.giftsDelivered,
  ].every((value) => value === 0);

export const isDoctorAppEmpty = (doctorApp: DoctorApp): boolean =>
  doctorApp.activeDoctors === 0 && doctorApp.ordersCreated === 0;
