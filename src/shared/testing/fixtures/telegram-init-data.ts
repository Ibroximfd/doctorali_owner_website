import { z } from "zod";

/**
 * Telegram mini app `initData` satri (`Telegram.WebApp.initData`): URL query
 * ko'rinishidagi juftlar, ichida `user` (JSON), `auth_date` va imzo `hash`.
 * Faqat testlardagi namuna backend uchun — haqiqiy tekshiruv backendda.
 */
const userSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
});

export type InitDataUser = {
  id: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
};

export type ParsedInitData = { user: InitDataUser; authDate: number; hash: string };

/** Juda uzun satr — buzilgan yoki soxta: Telegram bergani bir necha yuz belgi. */
export const INIT_DATA_MAX_LENGTH = 4096;

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

export const parseInitData = (raw: string): ParsedInitData | null => {
  if (raw === "" || raw.length > INIT_DATA_MAX_LENGTH) return null;

  const params = new URLSearchParams(raw);
  const hash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  const user = userSchema.safeParse(parseJson(params.get("user") ?? ""));
  if (!hash || !Number.isInteger(authDate) || authDate <= 0 || !user.success) return null;

  return {
    hash,
    authDate,
    user: {
      id: user.data.id,
      firstName: user.data.first_name,
      lastName: user.data.last_name ?? null,
      username: user.data.username ?? null,
      languageCode: user.data.language_code ?? null,
    },
  };
};
