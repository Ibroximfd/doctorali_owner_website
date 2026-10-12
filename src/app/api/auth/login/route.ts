import { z } from "zod";

import { backendFetch, clientInfoOf, errorResponse, jsonResponse, relay } from "@/shared/lib/backend.server";
import { writeSession } from "@/shared/lib/session.server";

const inputSchema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });

const tokensSchema = z.object({ access: z.string().min(1), refresh: z.string().min(1), user: z.unknown() });

/**
 * Login + parol. Backend SMS bosqichisiz darhol tokenlarni bersa — ular httpOnly cookie
 * ga yoziladi va brauzerga faqat `user` qaytadi. SMS/TOTP yoqilgan bo'lsa — `challenge`
 * o'zgarishsiz uzatiladi (2-qadam: `/api/auth/verify`).
 */
export async function POST(request: Request): Promise<Response> {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return errorResponse(400, "validation_error");

  try {
    const response = await backendFetch("/api/owner/login/", {
      method: "POST",
      body: input.data,
      client: clientInfoOf(request),
    });
    if (!response.ok) return await relay(response);

    const json: unknown = await response.json().catch(() => null);
    const tokens = tokensSchema.safeParse(json);
    if (!tokens.success) return jsonResponse(json);

    await writeSession({ access: tokens.data.access, refresh: tokens.data.refresh }, "web");
    return jsonResponse({ user: tokens.data.user });
  } catch {
    return errorResponse(502, "backend_unreachable");
  }
}

export const dynamic = "force-dynamic";
