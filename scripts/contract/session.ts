/**
 * Shartnoma tekshiruvi uchun backend sessiyasi — lokal faylda (`.contract-session.json`,
 * gitga tushmaydi, faqat egasi o'qiy oladi). Token ekranga hech qachon chiqarilmaydi.
 */
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const SESSION_FILE = join(process.cwd(), ".contract-session.json");

export type ContractSession = { origin: string; access: string; refresh: string; savedAt: string };

const isSession = (value: unknown): value is ContractSession =>
  typeof value === "object" &&
  value !== null &&
  ["origin", "access", "refresh"].every((key) => typeof (value as Record<string, unknown>)[key] === "string");

export const readSession = (): ContractSession | null => {
  if (!existsSync(SESSION_FILE)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(SESSION_FILE, "utf8"));
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveSession = (session: Omit<ContractSession, "savedAt">): void => {
  writeFileSync(SESSION_FILE, JSON.stringify({ ...session, savedAt: new Date().toISOString() }, null, 2));
  chmodSync(SESSION_FILE, 0o600);
};

/** Access 15 daqiqa yashaydi — refresh token bilan yangisi olinadi. */
export const refreshSession = async (session: ContractSession): Promise<ContractSession | null> => {
  const response = await fetch(new URL("/api/user/refresh/", session.origin), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ refresh: session.refresh }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return null;
  const body = (await response.json().catch(() => null)) as { access?: unknown; refresh?: unknown } | null;
  if (typeof body?.access !== "string") return null;
  const next = {
    origin: session.origin,
    access: body.access,
    refresh: typeof body.refresh === "string" ? body.refresh : session.refresh,
  };
  saveSession(next);
  return { ...next, savedAt: new Date().toISOString() };
};
