import "server-only";

import { z } from "zod";

import { backendFetch, errorResponse, jsonResponse, type ClientInfo } from "@/shared/lib/backend.server";
import { writeSession } from "@/shared/lib/session.server";

/**
 * Telegram orqali kirishning umumiy qismi (`/api/auth/telegram/*`). `initData`
 * imzosini backend tekshiradi (`doctor_ali_owner_bot/docs/02_BACKEND_TZ.md` §2).
 */

/** Telegram bergan `initData` bir necha yuz belgi; juda uzuni — buzilgan yoki soxta. */
const INIT_DATA_MAX_LENGTH = 4096;

export const initDataSchema = z.string().min(1).max(INIT_DATA_MAX_LENGTH);
export const pinSchema = z.string().regex(/^\d{4}$/);

type Forwarded = { status: number; json: unknown };
type Action = "status" | "login" | "link";

export const forwardTelegram = async (
  action: Action,
  body: Record<string, string>,
  client: ClientInfo,
  access?: string | null,
): Promise<Forwarded> => {
  const response = await backendFetch(`/api/owner/telegram/${action}/`, {
    method: "POST",
    body,
    access,
    client,
  });
  return { status: response.status, json: await response.json().catch(() => null) };
};

const tokensSchema = z.object({ access: z.string().min(1), refresh: z.string().min(1), user: z.unknown() });

/**
 * PIN bilan kirish: tokenlar Telegram sessiyasi bo'lib (qisqa muddat, kanal
 * belgisi bilan) httpOnly cookie ga yoziladi; brauzerga faqat foydalanuvchi.
 */
export const signInWithPin = async (initData: string, pin: string, client: ClientInfo): Promise<Response> => {
  const result = await forwardTelegram("login", { init_data: initData, pin }, client);
  if (result.status !== 200) return jsonResponse(result.json, result.status);

  const tokens = tokensSchema.safeParse(result.json);
  if (!tokens.success) return errorResponse(502, "backend_contract");

  await writeSession({ access: tokens.data.access, refresh: tokens.data.refresh }, "telegram");
  return jsonResponse({ user: tokens.data.user });
};
