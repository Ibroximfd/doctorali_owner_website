import "server-only";

import { z } from "zod";

import { env } from "@/shared/config/env";
import { serverEnv } from "@/shared/config/env.server";
import { backendFetch, errorResponse, jsonResponse, type ClientInfo } from "@/shared/lib/backend.server";
import { writeSession } from "@/shared/lib/session.server";
import { INIT_DATA_MAX_LENGTH } from "@/shared/lib/telegram-init-data";
import { checkInitData } from "@/shared/lib/telegram-init-data.server";
import { resolveMock } from "@/shared/mocks/registry";

/**
 * Telegram orqali kirishning umumiy qismi (`/api/auth/telegram/*`). Haqiqiy
 * rejimda `initData` ni backend tekshiradi; namuna rejimida — shu yerda
 * (bot tokeni berilgan bo'lsa), keyin javobni `shared/mocks` beradi.
 */

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
  if (env.isMocking)
    return resolveMock({
      method: "POST",
      path: `telegram/${action}/`,
      searchParams: new URLSearchParams(),
      body,
    });

  const response = await backendFetch(`/api/owner/telegram/${action}/`, {
    method: "POST",
    body,
    access,
    client,
  });
  return { status: response.status, json: await response.json().catch(() => null) };
};

/** Namuna rejimida imzo tekshiruvi; o'tmasa — tayyor xato javobi. */
export const rejectForgedInitData = (initData: string): Response | null => {
  if (!env.isMocking || serverEnv.telegramBotToken === null) return null;
  const result = checkInitData(initData, serverEnv.telegramBotToken);
  return result === "ok" ? null : errorResponse(400, `init_data_${result}`);
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
