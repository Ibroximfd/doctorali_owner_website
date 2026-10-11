import "server-only";

import { z } from "zod";

import { serverEnv } from "@/shared/config/env.server";

/** Django backendga server tomonidan murojaat (BFF). Brauzer bu manzilni ko'rmaydi. */

const BACKEND_TIMEOUT_MS = 20_000;

/** Brauzer haqida backend audit jurnali va urinishlar cheklovi uchun bilishi kerak bo'lganlar. */
export type ClientInfo = { ip: string | null; userAgent: string | null };

type BackendInit = {
  method?: string;
  body?: unknown;
  access?: string | null;
  search?: string;
  lang?: string;
  client?: ClientInfo;
};

/**
 * Mijoz IP si reverse proxy (nginx) qo'ygan `X-Real-IP` dan (`docs/DEPLOY.md` §4 —
 * nginx uni o'zi yozadi, brauzer soxtalashtira olmaydi). Backend bularni faqat
 * BFF dan kelgan so'rovda ishonchli deb hisoblaydi (`BACKEND_HANDOFF` §1).
 */
export const clientInfoOf = (request: Request): ClientInfo => ({
  ip: request.headers.get("x-real-ip")?.trim() || null,
  userAgent: request.headers.get("user-agent"),
});

export const backendFetch = async (
  path: string,
  { method = "GET", body, access, search = "", lang, client }: BackendInit = {},
): Promise<Response> => {
  const headers = new Headers({ accept: "application/json" });
  if (body !== undefined) headers.set("content-type", "application/json");
  if (access) headers.set("authorization", `Bearer ${access}`);
  // Platforma odati: server matnlari (signal sarlavhasi va h.k.) shu tilda keladi.
  if (lang) headers.set("x-lang", lang);
  if (client?.ip) headers.set("x-forwarded-for", client.ip);
  if (client?.userAgent) headers.set("user-agent", client.userAgent);

  return fetch(`${serverEnv.backendOrigin}${path}${search}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    // Hamma narsa pul va odamlar haqida — hech narsa keshlanmaydi.
    cache: "no-store",
    signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
  });
};

const refreshSchema = z.object({ access: z.string().min(1), refresh: z.string().min(1).optional() });

export type RefreshResult =
  | { kind: "renewed"; tokens: { access: string; refresh?: string } }
  /** Refresh token yaroqsiz — sessiya haqiqatan tugagan. */
  | { kind: "expired" }
  /** Backend javob bermadi yoki xato qaytardi — sessiya hali tirik, keyinroq urinish mumkin. */
  | { kind: "unavailable" };

/**
 * Bir xil refresh token bilan bir vaqtda kelgan so'rovlar (fokusda 5–10 ta blok)
 * bitta yangilanishni kutadi: rotatsiyada ikkinchi urinish 401 olib, foydalanuvchini
 * chiqarib yubormasin. Natija qisqa vaqt eslab qolinadi — kechikib kelganlar ham oladi.
 */
const REFRESH_MEMO_MS = 15_000;
const inflight = new Map<string, Promise<RefreshResult>>();

const requestRefresh = async (refresh: string): Promise<RefreshResult> => {
  try {
    const response = await backendFetch("/api/user/refresh/", { method: "POST", body: { refresh } });
    if (response.status === 400 || response.status === 401) return { kind: "expired" };
    if (!response.ok) return { kind: "unavailable" };
    const parsed = refreshSchema.safeParse(await response.json());
    return parsed.success ? { kind: "renewed", tokens: parsed.data } : { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
};

export const refreshAccess = (refresh: string): Promise<RefreshResult> => {
  const pending = inflight.get(refresh);
  if (pending) return pending;

  const result = requestRefresh(refresh);
  inflight.set(refresh, result);
  void result.then(() => setTimeout(() => inflight.delete(refresh), REFRESH_MEMO_MS));
  return result;
};

/** Backend javobini o'zgartirmasdan (status + JSON) brauzerga uzatadi. */
export const relay = async (response: Response): Promise<Response> => {
  const isJson = response.headers.get("content-type")?.includes("application/json") ?? false;
  const text = await response.text();
  // Django HTML xato sahifasi panel originidan berilmasin — faqat JSON uzatiladi.
  if (!isJson && text !== "") return errorResponse(response.ok ? 502 : response.status, "backend_error");
  return new Response(text === "" ? null : text, {
    status: response.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

/**
 * Tayyor hisobot fayli (`reports/export/{id}/file/?sig=…`): XLSX/PDF o'zgarishsiz,
 * oqim bilan uzatiladi — nomi va turi backend sarlavhalaridan.
 */
export const relayFile = (response: Response): Response => {
  const headers = new Headers({ "cache-control": "no-store" });
  for (const name of ["content-type", "content-disposition", "content-length"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers });
};

export const jsonResponse = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export const errorResponse = (status: number, code: string, detail?: string): Response =>
  jsonResponse({ code, detail: detail ?? code }, status);
