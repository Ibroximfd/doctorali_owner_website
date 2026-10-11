import { routes, type PanelRouteKey } from "@/shared/config/routes";
import { tashkentDate } from "@/shared/lib/scope";
import type { Filial } from "@/shared/meta/meta.schema";

import {
  EDITABLE_CHANNELS,
  type Session,
  type TargetItem,
  type Targets,
  type TargetsFormValues,
} from "./settings.schema";

/* ---------- oylik reja ---------- */

const MILLION = 1_000_000;

/** Joriy oy Toshkent vaqti bilan: `2026-10`. */
export const currentMonth = (now: Date): string => tashkentDate(now).slice(0, 7);

/** Simda — so'm (butun son), formada — million so'm. */
export const toMillions = (amount: number): number => amount / MILLION;
export const fromMillions = (millions: number): number => Math.round(millions * MILLION);

const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

/**
 * Maydon matni → son: `"1 100"`, `"12,5"`, `"12.5"` qabul qilinadi. Bo'sh yoki
 * tushunarsiz matn `NaN` bo'ladi — sxema uni "son kiriting" xatosiga aylantiradi.
 */
export const parseAmount = (raw: unknown): number => {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return Number.NaN;
  const text = raw.replace(/\s/g, "").replace(",", ".");
  return PLAIN_NUMBER.test(text) ? Number(text) : Number.NaN;
};

/** Jadval qatori: filial va uning kanallari (million so'mda). `null` — bu filialda shu kanal yo'q. */
export type TargetRow = { filialId: number; name: string; delivery: number | null; clinic: number | null };

const amountOf = (targets: Targets, filialId: number, channel: string): number =>
  targets.items.find((item) => item.filial === filialId && item.channel === channel)?.amount ?? 0;

/** Yuklangan reja → forma qatorlari. Klinikasi yo'q filialda klinika maydoni bo'lmaydi (sotuv ham shunday). */
export const toTargetRows = (targets: Targets, filials: readonly Filial[]): TargetRow[] =>
  filials
    .filter((filial) => filial.hasSales || filial.hasClinic)
    .map((filial) => ({
      filialId: filial.id,
      name: filial.name,
      delivery: filial.hasSales ? toMillions(amountOf(targets, filial.id, "delivery")) : null,
      clinic: filial.hasClinic ? toMillions(amountOf(targets, filial.id, "clinic")) : null,
    }));

type FormRow = TargetsFormValues["rows"][number];

const editedItems = (rows: readonly FormRow[]): TargetItem[] =>
  rows.flatMap((row) =>
    EDITABLE_CHANNELS.flatMap((channel) => {
      const millions = row[channel];
      return millions === null ? [] : [{ filial: row.filialId, channel, amount: fromMillions(millions) }];
    }),
  );

/** Jadvalda tahrirlanmaydigan yozuvlar (onlayn konsultatsiya, noma'lum kanal) — saqlashda o'zgarishsiz qaytariladi. */
export const preservedItems = (targets: Targets, rows: readonly FormRow[]): TargetItem[] => {
  const edited = editedItems(rows);
  return targets.items.filter(
    (item) => !edited.some((other) => other.filial === item.filial && other.channel === item.channel),
  );
};

/**
 * Forma → `PUT /targets/` tanasi. To'liq ro'yxat yuboriladi (tahrirlangan +
 * o'zgarmagan) — backend "almashtirish" deb tushunsa ham hech narsa yo'qolmaydi.
 */
export const toTargetsInput = (month: string, rows: readonly FormRow[], loaded: Targets): Targets => ({
  month,
  items: [...editedItems(rows), ...preservedItems(loaded, rows)],
});

/** Yozilayotgan (hali tekshirilmagan) qiymat: yaroqsiz yoki manfiy bo'lsa jamiga qo'shilmaydi. */
const safeAmount = (millions: number | null | undefined): number =>
  typeof millions === "number" && Number.isFinite(millions) && millions > 0 ? fromMillions(millions) : 0;

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

export type TargetTotals = { delivery: number; clinic: number; consultation: number; total: number };

/**
 * Jami qator (so'mda), yozish paytida jonli. `total` kanali alohida "umumiy
 * reja" — kanallar yig'indisiga qo'shilmaydi (ikki marta sanalmasin).
 */
export const targetTotals = (
  rows: readonly { delivery?: number | null; clinic?: number | null }[],
  preserved: readonly TargetItem[],
): TargetTotals => {
  const delivery = sum(rows.map((row) => safeAmount(row.delivery)));
  const clinic = sum(rows.map((row) => safeAmount(row.clinic)));
  const consultation = sum(
    preserved.filter((item) => item.channel === "consultation").map((item) => item.amount),
  );
  const rest = sum(
    preserved
      .filter((item) => item.channel !== "consultation" && item.channel !== "total")
      .map((item) => item.amount),
  );
  return { delivery, clinic, consultation, total: delivery + clinic + consultation + rest };
};

/* ---------- sessiyalar ---------- */

/** `iPhone 15 · Safari` — brauzer noma'lum bo'lsa faqat qurilma. */
export const sessionLabel = (session: Pick<Session, "device" | "browser">): string =>
  session.browser ? `${session.device} · ${session.browser}` : session.device;

/* ---------- kirish huquqlari ---------- */

const KNOWN_ROLES: readonly string[] = ["owner", "owner_viewer"];

/** Tarjimasi bor rol. Noma'lum rol o'z nomi bilan ko'rsatiladi. */
export const isKnownRole = (role: string): boolean => KNOWN_ROLES.includes(role);

/** Bo'lim kaliti navigatsiyadagi yo'l kaliti bilan bir xil (`finance`, `orders` …). */
export const isSectionKey = (section: string): section is PanelRouteKey =>
  section !== "login" && Object.hasOwn(routes, section);

/** Filial id lari → nomlar; lug'atda yo'q id `#id` ko'rinishida qoladi. */
export const filialNames = (
  ids: readonly number[],
  filials: readonly Pick<Filial, "id" | "name">[],
): string[] => ids.map((id) => filials.find((filial) => filial.id === id)?.name ?? `#${id}`);
