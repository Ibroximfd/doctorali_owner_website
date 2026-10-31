import ky, { isHTTPError, isTimeoutError, type KyInstance } from "ky";

import { AppError, ENDPOINT_MISSING, kindFromStatus, toAppError } from "./app-error";

/**
 * Brauzerdan chiqadigan yagona API klienti. Hamma so'rov o'z originimizdagi
 * BFF ga (`/api/owner/…`) boradi — token httpOnly cookie da, JS uni ko'rmaydi.
 * Faqat klientda chaqiriladi (so'rovlar TanStack Query hooklaridan chiqadi).
 */

/**
 * Kutish chegarasi. Panel blokining javobi odatda < 0,5 s; 10 s dan oshsa backend
 * osilgan — foydalanuvchini skeleton bilan uzoq ushlab turmasdan xatoni ko'rsatamiz.
 */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Backendda hali yoqilmagan endpointlar (404/405/501) shu muddat eslab qolinadi:
 * davriy yangilanish va fokus qayta-qayta tarmoqqa chiqmaydi, blok darhol
 * «hali ulanmagan» holatini ko'rsatadi. Muddat tugagach yana bir marta tekshiriladi.
 */
const MISSING_TTL_MS = 5 * 60_000;
const MISSING_STATUSES = new Set([404, 405, 501]);
const missingUntil = new Map<string, number>();

const instances = new Map<string, KyInstance>();

const clientFor = (basePath: string): KyInstance => {
  const existing = instances.get(basePath);
  if (existing) return existing;

  const created = ky.create({
    baseUrl: new URL(basePath, window.location.origin),
    timeout: REQUEST_TIMEOUT_MS,
    // Qayta urinish faqat TanStack Query da (bitta joyda) — ikki qatlam ustma-ust
    // urinsa, osilgan backendda kutish ko'payib ketadi.
    retry: 0,
    credentials: "same-origin",
  });
  instances.set(basePath, created);
  return created;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Backend xato tanasi `{code, detail}`. ky 2 tanani o'zi o'qib `error.data` ga
 * qo'yadi — `response.json()` u yerda allaqachon iste'mol qilingan bo'ladi.
 */
const readErrorBody = (
  data: unknown,
): { code?: string; detail?: string; fields?: Record<string, unknown> } => {
  if (!isRecord(data)) return {};
  return {
    code: typeof data.code === "string" ? data.code : undefined,
    detail: typeof data.detail === "string" ? data.detail : undefined,
    fields: isRecord(data.fields) ? data.fields : undefined,
  };
};

/** Transport xatosini ilova lug'atiga bir marta, shu yerda tarjima qiladi. */
const translate = async (error: unknown): Promise<AppError> => {
  if (isHTTPError(error)) {
    const { code, detail, fields } = readErrorBody(error.data);
    return new AppError(kindFromStatus(error.response.status), detail, code, fields);
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

const getFrom = async (base: string, path: string, params?: QueryParams): Promise<unknown> => {
  const memoKey = `${base}${path}`;
  const knownMissing = missingUntil.get(memoKey);
  if (knownMissing !== undefined) {
    if (knownMissing > Date.now()) throw new AppError("not-found", "endpoint_missing", ENDPOINT_MISSING);
    missingUntil.delete(memoKey);
  }
  try {
    return await clientFor(base)
      .get(path, { searchParams: cleanParams(params) })
      .json<unknown>();
  } catch (error) {
    if (isHTTPError(error) && MISSING_STATUSES.has(error.response.status) && !hasErrorCode(error.data))
      missingUntil.set(memoKey, Date.now() + MISSING_TTL_MS);
    throw await translate(error);
  }
};

/** `path` — `/api/owner/` ga nisbatan, boshida `/` siz va oxirida `/` bilan: `structure/`. */
export const apiGet = (path: string, params?: QueryParams): Promise<unknown> =>
  getFrom("/api/owner/", path, params);

/** Sklad API (`/api/sklad/…`) — logist saytidagi bilan bir xil (v2 §2.10). */
export const skladGet = (path: string, params?: QueryParams): Promise<unknown> =>
  getFrom("/api/sklad/", path, params);

/**
 * Backend o'zi yozgan 404 (`{code: "not_found"}` — masalan, buyurtma topilmadi) yo'q
 * endpoint emas: u eslab qolinmaydi. BFF ning `backend_error` i — Django HTML sahifasi,
 * ya'ni yo'l umuman yo'q.
 */
const hasErrorCode = (data: unknown): boolean => {
  const { code } = readErrorBody(data);
  return code !== undefined && code !== "backend_error";
};

/** Testlar uchun: eslab qolingan yo'q endpointlarni tozalaydi. */
export const resetMissingEndpoints = (): void => missingUntil.clear();

type Method = "post" | "put" | "patch" | "delete";

const sendTo = async (base: string, method: Method, path: string, body?: unknown): Promise<unknown> => {
  try {
    const response = await clientFor(base)(path, { method, json: body });
    return response.status === 204 ? null : await response.json<unknown>();
  } catch (error) {
    throw await translate(error);
  }
};

export const apiSend = (method: Method, path: string, body?: unknown): Promise<unknown> =>
  sendTo("/api/owner/", method, path, body);

export const skladSend = (method: Method, path: string, body?: unknown): Promise<unknown> =>
  sendTo("/api/sklad/", method, path, body);

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
