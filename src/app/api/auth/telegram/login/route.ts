import { z } from "zod";

import { clientInfoOf, errorResponse } from "@/shared/lib/backend.server";

import { initDataSchema, pinSchema, signInWithPin } from "../telegram-backend";

const inputSchema = z.object({ init_data: initDataSchema, pin: pinSchema });

/** PIN bilan kirish. Xato urinishlar hisobi va qulf — backendda. */
export async function POST(request: Request): Promise<Response> {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return errorResponse(400, "validation_error");

  try {
    return await signInWithPin(input.data.init_data, input.data.pin, clientInfoOf(request));
  } catch {
    return errorResponse(502, "backend_unreachable");
  }
}

export const dynamic = "force-dynamic";
