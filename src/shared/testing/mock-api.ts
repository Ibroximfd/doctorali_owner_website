import { resolveMock } from "@/shared/mocks/registry";

/** Testlar uchun qat'iy "hozir": 2026-10-02 14:05 (Toshkent), juma. */
export const TEST_NOW = new Date("2026-10-02T09:05:00Z");

/**
 * Namuna javobni to'g'ridan-to'g'ri oladi (tarmoqsiz). Shartnoma testlari
 * shundan foydalanadi: har namuna o'z bo'limining zod sxemasidan o'tishi shart —
 * shunda mock va sxema bir-biridan ajralib ketmaydi.
 */
export const mockGet = (path: string, query: Record<string, string> = {}): unknown => {
  const response = resolveMock({
    method: "GET",
    path,
    searchParams: new URLSearchParams(query),
    now: TEST_NOW,
  });
  if (response.status !== 200)
    throw new Error(`Mock ${path} → ${response.status}: ${JSON.stringify(response.json)}`);
  return response.json;
};

export const mockSend = (
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): { status: number; json: unknown } =>
  resolveMock({ method, path, searchParams: new URLSearchParams(), body, now: TEST_NOW });

/** Scope parametrlarining tipik to'plamlari — har endpoint shularning barchasida ishlashi kerak. */
export const SCOPE_CASES: readonly Record<string, string>[] = [
  { period: "today" },
  { period: "yesterday" },
  { period: "7d" },
  { period: "30d" },
  { period: "month" },
  { period: "prev_month" },
  { period: "year" },
  { period: "custom", date_from: "2026-07-05", date_to: "2026-10-02" },
  { period: "30d", filial: "3" },
  { period: "30d", filial: "1,2", compare: "none" },
  { period: "30d", compare: "yoy" },
];
