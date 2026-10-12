import { backendFetch, jsonResponse } from "@/shared/lib/backend.server";
import { clearSession, readSession } from "@/shared/lib/session.server";

/** Chiqish: cookie har doim tozalanadi; backend refresh tokenni bekor qilishi — qo'shimcha. */
export async function POST(): Promise<Response> {
  const session = await readSession();

  if (session.refresh !== null) {
    // Backend javob bermasa ham foydalanuvchi chiqishi kerak.
    await backendFetch("/api/owner/logout/", {
      method: "POST",
      body: { refresh: session.refresh },
      access: session.access,
    }).catch(() => null);
  }

  await clearSession();
  return jsonResponse({ ok: true });
}

export const dynamic = "force-dynamic";
