import { z } from "zod";

import { backendFetch, errorResponse, jsonResponse } from "@/shared/lib/backend.server";
import { readSession } from "@/shared/lib/session.server";

const ticketSchema = z.object({ ticket: z.string().min(1), expires_in: z.number() });

/**
 * WebSocket uchun bir martalik qisqa token. Access token URL ga qo'yilmaydi —
 * u faqat shu yerda, server tomonida ishlatiladi.
 */
export async function GET(): Promise<Response> {
  const session = await readSession();
  if (session.access === null) return errorResponse(401, "unauthorized");

  try {
    const response = await backendFetch("/api/owner/ws-ticket/", { method: "POST", access: session.access });
    if (!response.ok) return jsonResponse({ ticket: null });
    const parsed = ticketSchema.safeParse(await response.json());
    return jsonResponse({ ticket: parsed.success ? parsed.data.ticket : null });
  } catch {
    return jsonResponse({ ticket: null });
  }
}

export const dynamic = "force-dynamic";
