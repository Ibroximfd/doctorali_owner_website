import { z } from "zod";

import { clientInfoOf, errorResponse, jsonResponse } from "@/shared/lib/backend.server";
import { clearSession } from "@/shared/lib/session.server";

import { forwardTelegram, initDataSchema, rejectForgedInitData } from "../telegram-backend";

const inputSchema = z.object({ init_data: initDataSchema });

/**
 * Mini app har ochilganda birinchi so'rov. Oldingi sessiya shu yerda yopiladi —
 * PIN har safar so'ralishining kafolati (`01_CONCEPT` §3-B).
 */
export async function POST(request: Request): Promise<Response> {
  await clearSession();

  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return errorResponse(400, "init_data_invalid");

  const forged = rejectForgedInitData(input.data.init_data);
  if (forged) return forged;

  try {
    const result = await forwardTelegram(
      "status",
      { init_data: input.data.init_data },
      clientInfoOf(request),
    );
    return jsonResponse(result.json, result.status);
  } catch {
    return errorResponse(502, "backend_unreachable");
  }
}

export const dynamic = "force-dynamic";
