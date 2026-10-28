import type { PanelRouteKey } from "@/shared/config/routes";

import type { GrantInput, Member } from "./access.schema";

/** Ko'ruvchiga berish mumkin bo'lgan bo'limlar (Ruxsatlar va Sozlamalar — faqat boshliqniki). */
export const GRANTABLE_SECTIONS = [
  "overview",
  "issues",
  "ai",
  "forecast",
  "orders",
  "finance",
  "clinic",
  "logistics",
  "warehouse",
  "settlements",
  "staff",
  "sales",
  "app",
  "products",
  "customers",
  "doctors",
  "alerts",
  "reports",
  "system",
] as const satisfies readonly PanelRouteKey[];

export type GrantableSection = (typeof GRANTABLE_SECTIONS)[number];
export const isGrantableSection = (value: string): value is GrantableSection =>
  GRANTABLE_SECTIONS.some((known) => known === value);

export const MEMBER_STATUSES = ["active", "pending", "expired", "revoked"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];
export const isMemberStatus = (value: string): value is MemberStatus =>
  MEMBER_STATUSES.some((known) => known === value);

/** Muddat variantlari (kun); `null` — muddatsiz. */
export const EXPIRY_OPTIONS = [null, 7, 30, 90] as const;
export type ExpiryOption = (typeof EXPIRY_OPTIONS)[number];

const DAY_MS = 86_400_000;

export const addDaysIso = (today: string, days: number): string =>
  new Date(Date.parse(`${today}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Necha kun qoldi (butun kun, 0 dan kam emas); muddatsiz — `null`. */
export const daysLeft = (expiresAt: string | null, now: number): number | null =>
  expiresAt === null ? null : Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / DAY_MS));

/** 3 kun yoki kamroq qolgan faol ruxsat — ogohlantiriladi. */
export const isExpiringSoon = (member: Pick<Member, "status" | "expiresAt">, now: number): boolean => {
  const left = daysLeft(member.expiresAt, now);
  return member.status === "active" && left !== null && left <= 3;
};

export const toggleIn = <Value>(list: readonly Value[], value: Value): Value[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

/** Forma tekshiruvi: odam tanlangan, kamida bitta bo'lim, nom bor. */
export const grantIssues = (
  input: Pick<GrantInput, "userId" | "sections" | "title">,
): ("person" | "sections" | "title")[] => [
  ...(input.userId > 0 ? [] : (["person"] as const)),
  ...(input.sections.length > 0 ? [] : (["sections"] as const)),
  ...(input.title.trim() ? [] : (["title"] as const)),
];

/** Faol ruxsatlar birinchi, keyin kutilayotgan, keyin tugaganlar; ichida — ism bo'yicha. */
export const sortMembers = (members: readonly Member[]): Member[] => {
  const rank = (status: string) => {
    const index = MEMBER_STATUSES.findIndex((known) => known === status);
    return index === -1 ? MEMBER_STATUSES.length : index;
  };
  return [...members].sort((a, b) => rank(a.status) - rank(b.status) || a.fullName.localeCompare(b.fullName));
};
