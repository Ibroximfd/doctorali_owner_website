import ky, { isHTTPError, isTimeoutError, type KyInstance } from "ky";

import { AppError, kindFromStatus, toAppError } from "./app-error";

/**
 * Brauzerdan chiqadigan yagona API klienti. Hamma so'rov o'z originimizdagi
 * BFF ga (`/api/owner/…`) boradi — token httpOnly cookie da, JS uni ko'rmaydi.
 * Faqat klientda chaqiriladi (so'rovlar TanStack Query hooklaridan chiqadi).
 */

const instances = new Map<string, KyInstance>();

const clientFor = (basePath: string): KyInstance => {
  const existing = instances.get(basePath);
  if (existing) return existing;

  const created = ky.create({
    baseUrl: new URL(basePath, window.location.origin),
    timeout: 20_000,
    // Faqat o'qish so'rovlari qayta uriniladi — yozuvlar idempotent emas.
    retry: { limit: 1, methods: ["get"] },
    credentials: "same-origin",
  });
  instances.set(basePath, created);
  return created;
};

const client = (): KyInstance => clientFor("/api/owner/");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Backend xato tanasi `{code, detail}`. ky 2 tanani o'zi o'qib `error.data` ga
 * qo'yadi — `response.json()` u yerda allaqachon iste'mol qilingan bo'ladi.
 */
const readErrorBody = (data: unknown): { code?: string; detail?: string } => {
  if (!isRecord(data)) return {};
  return {
    code: typeof data.code === "string" ? data.code : undefined,
    detail: typeof data.detail === "string" ? data.detail : undefined,
  };
};

/** Transport xatosini ilova lug'atiga bir marta, shu yerda tarjima qiladi. */
const translate = async (error: unknown): Promise<AppError> => {
  if (isHTTPError(error)) {
    const { code, detail } = readErrorBody(error.data);
    return new AppError(kindFromStatus(error.response.status), detail, code);
  }
  if (isTimeoutError(error)) return new AppError("offline", "timeout");
  return toAppError(error);
};

export type QueryParams = Record<string, string | number | boolean | undefined>;

const cleanParams = (params: QueryParams | undefined): Record<string, string> | undefined => {
  if (!params) return undefined;
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== "");
  return Object.fromEntries(entries.map(([key, value]) => [key, String(value)]));
};

/** `path` — `/api/owner/` ga nisbatan, boshida `/` siz va oxirida `/` bilan: `orders/summary/`. */
export const apiGet = async (path: string, params?: QueryParams): Promise<unknown> => {
  try {
    return await client()
      .get(path, { searchParams: cleanParams(params) })
      .json<unknown>();
  } catch (error) {
    throw await translate(error);
  }
};

export const apiSend = async (
  method: "post" | "put" | "patch" | "delete",
  path: string,
  body?: unknown,
): Promise<unknown> => {
  try {
    const response = await client()(path, { method, json: body });
    return response.status === 204 ? null : await response.json<unknown>();
  } catch (error) {
    throw await translate(error);
  }
};

/** Kirish/chiqish yo'llari (`/api/auth/…`) — sessiya cookie sini BFF boshqaradi. */
export const authSend = async (path: string, body?: unknown): Promise<unknown> => {
  try {
    return await clientFor("/api/auth/")
      .post(path, { json: body ?? {} })
      .json<unknown>();
  } catch (error) {
    throw await translate(error);
  }
};

export const authGet = async (path: string): Promise<unknown> => {
  try {
    return await clientFor("/api/auth/").get(path).json<unknown>();
  } catch (error) {
    throw await translate(error);
  }
};
