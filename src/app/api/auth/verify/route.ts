import { z } from "zod";

import { backendFetch, clientInfoOf, errorResponse, jsonResponse, relay } from "@/shared/lib/backend.server";
import { writeSession } from "@/shared/lib/session.server";

const inputSchema = z.object({ challenge_id: z.string().min(1), code: z.string().regex(/^\d{6}$/) });

const tokensSchema = z.object({ access: z.string().min(1), refresh: z.string().min(1), user: z.unknown() });

/**
 * 2-qadam: kod to'g'ri bo'lsa tokenlar httpOnly cookie ga yoziladi va
 * brauzerga faqat foydalanuvchi ma'lumoti qaytadi — tokenning o'zi emas.
 */
export async function POST(request: Request): Promise<Response> {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return errorResponse(400, "validation_error");

  try {
    const response = await backendFetch("/api/owner/login/verify/", {
      method: "POST",
      body: input.data,
      client: clientInfoOf(request),
    });
    if (!response.ok) return await relay(response);

    const tokens = tokensSchema.safeParse(await response.json());
    if (!tokens.success) return errorResponse(502, "backend_contract");

    await writeSession({ access: tokens.data.access, refresh: tokens.data.refresh });
    return jsonResponse({ user: tokens.data.user });
  } catch {
    return errorResponse(502, "backend_unreachable");
  }
}

export const dynamic = "force-dynamic";
