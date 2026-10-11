import { type NextRequest } from "next/server";

import { LOCALE_COOKIE } from "@/i18n/locales";
import { env } from "@/shared/config/env";
import {
  backendFetch,
  clientInfoOf,
  errorResponse,
  jsonResponse,
  refreshAccess,
  relay,
  relayFile,
} from "@/shared/lib/backend.server";
import { clearSession, readSession, writeSession } from "@/shared/lib/session.server";
import { resolveMock } from "@/shared/mocks/registry";

/**
 * BFF: brauzer `/api/owner/…` ga murojaat qiladi, bu yerda httpOnly cookie dagi
 * token `Authorization: Bearer` ga aylanadi va so'rov backendga uzatiladi.
 * Token muddati tugagan bo'lsa bir marta yangilanib, so'rov qayta yuboriladi.
 * Namuna rejimida backend o'rniga `shared/mocks` javob beradi.
 */

type RouteContext = { params: Promise<{ path: string[] }> };

const SAFE_SEGMENT = /^[\w.~-]+$/;
/** `.` va `..` — `fetch` ularni yo'lga aylantiradi va so'rov `/api/owner/` dan chiqib ketadi. */
const DOT_SEGMENT = /^\.+$/;

const readBody = async (request: NextRequest): Promise<unknown> => {
  if (request.method === "GET" || request.method === "HEAD") return undefined;
  const text = await request.text();
  if (text === "") return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
};

async function handle(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  if (!path.every((segment) => SAFE_SEGMENT.test(segment) && !DOT_SEGMENT.test(segment)))
    return errorResponse(400, "invalid_path");

  const session = await readSession();
  if (session.access === null && session.refresh === null) return errorResponse(401, "unauthorized");

  // Django yo'llari `/` bilan tugaydi — Next uni `params` dan olib tashlaydi.
  const relativePath = `${path.join("/")}/`;
  const body = await readBody(request);

  if (env.isMocking) {
    const mock = resolveMock({
      method: request.method,
      path: relativePath,
      searchParams: request.nextUrl.searchParams,
      body,
    });
    return jsonResponse(mock.json, mock.status);
  }

  const forward = (access: string | null) =>
    backendFetch(`/api/owner/${relativePath}`, {
      method: request.method,
      body,
      access,
      search: request.nextUrl.search,
      lang: request.cookies.get(LOCALE_COOKIE)?.value,
      client: clientInfoOf(request),
    });

  try {
    let response = session.access === null ? null : await forward(session.access);

    if (response === null || response.status === 401) {
      if (session.refresh === null) {
        await clearSession();
        return errorResponse(401, "unauthorized");
      }
      const renewed = await refreshAccess(session.refresh);
      // Backend vaqtincha javob bermasa sessiya saqlanadi — faqat refresh yaroqsiz bo'lsa chiqariladi.
      if (renewed.kind === "unavailable") return errorResponse(502, "backend_unreachable");
      if (renewed.kind === "expired") {
        await clearSession();
        return errorResponse(401, "unauthorized");
      }
      await writeSession(renewed.tokens);
      response = await forward(renewed.tokens.access);
    }
    // Hisobot fayli — JSON emas, ikkilik oqim.
    if (response.ok && relativePath.endsWith("/file/")) return relayFile(response);
    return await relay(response);
  } catch {
    return errorResponse(502, "backend_unreachable");
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

/** Har so'rov cookie ga bog'liq — hech qachon oldindan render qilinmaydi. */
export const dynamic = "force-dynamic";
