import type { ClinicDoctor } from "./clinic.schema";

type FilialLike = { id: number; hasClinic: boolean };

/** Tanlangan filiallar ichidan klinikasi borlari. Tanlov bo'sh — barcha filiallar. */
export const clinicsInScope = <Filial extends FilialLike>(
  selected: readonly number[],
  filials: readonly Filial[],
): Filial[] =>
  filials.filter((filial) => filial.hasClinic && (selected.length === 0 || selected.includes(filial.id)));

export type ClinicAvailability = "available" | "unavailable" | "unknown";

/**
 * Tanlangan filiallarda klinika bormi. Filiallar lug'ati hali kelmagan bo'lsa —
 * `unknown`: javobni bilmay turib klinika so'rovlari yuborilmaydi.
 */
export const clinicAvailability = (
  selected: readonly number[],
  filials: readonly FilialLike[] | undefined,
): ClinicAvailability => {
  if (selected.length === 0) return "available";
  if (filials === undefined) return "unknown";
  return clinicsInScope(selected, filials).length > 0 ? "available" : "unavailable";
};

/** Tushum tarkibi seriyalari — rang tartibga emas, shu kalitga biriktiriladi. */
export const REVENUE_MIX_KEYS = ["products", "treatments", "consultations"] as const;
export type RevenueMixKey = (typeof REVENUE_MIX_KEYS)[number];

export const isRevenueMixKey = (key: string): key is RevenueMixKey =>
  REVENUE_MIX_KEYS.some((known) => known === key);

export type ClosingState = "balanced" | "shortage" | "surplus" | "open" | "reopened" | "unknown";

/** Kechagi kassa yopilishi: yopilgan bo'lsa farqqa qarab — farqsiz, kamomad yoki ortiqcha. */
export const closingState = (status: string | null, difference: number | null): ClosingState => {
  if (status === "open" || status === "reopened") return status;
  if (status !== "closed" || difference === null) return "unknown";
  if (difference < 0) return "shortage";
  return difference > 0 ? "surplus" : "balanced";
};

/** Sotuv bo'yicha eng yuqori `limit` ta shifokor. */
export const topDoctors = (doctors: readonly ClinicDoctor[], limit: number): ClinicDoctor[] =>
  [...doctors].sort((first, second) => second.salesRevenue - first.salesRevenue).slice(0, limit);
