import { z } from "zod";

import { clientInfoOf, errorResponse, jsonResponse } from "@/shared/lib/backend.server";
import { readSession } from "@/shared/lib/session.server";

import { forwardTelegram, initDataSchema, pinSchema, signInWithPin } from "../telegram-backend";

const inputSchema = z.object({ init_data: initDataSchema, pin: pinSchema });

/**
 * Bog'lash (yoki PIN ni tiklash): faqat parol + SMS bilan hozirgina ochilgan
 * sessiya bilan. Muvaffaqiyatli bo'lsa darhol shu PIN bilan kiriladi — sessiya
 * Telegram sessiyasiga almashadi (uzoq muddatli parol sessiyasi qolmaydi).
 */
export async function POST(request: Request): Promise<Response> {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return errorResponse(400, "validation_error");

  const session = await readSession();
  if (session.access === null) return errorResponse(401, "reauth_required");

  try {
    const body = { init_data: input.data.init_data, pin: input.data.pin };
    const client = clientInfoOf(request);
    const linked = await forwardTelegram("link", body, client, session.access);
    if (linked.status !== 200) return jsonResponse(linked.json, linked.status);

    return await signInWithPin(input.data.init_data, input.data.pin, client);
  } catch {
    return errorResponse(502, "backend_unreachable");
  }
}

export const dynamic = "force-dynamic";
