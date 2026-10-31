import { parseJson } from "@/shared/lib/envelope";
import { apiGet, apiSend } from "@/shared/lib/http";

import { sessionsResponseSchema, type Session } from "../model/settings.schema";

export const loadSessions = async (): Promise<Session[]> =>
  parseJson(sessionsResponseSchema, await apiGet("sessions/")).results;

/** Sessiyani uzadi. Javob tanasi ishlatilmaydi (backend `204` qaytarishi mumkin). */
export const revokeSession = async (id: string): Promise<void> => {
  await apiSend("delete", `sessions/${encodeURIComponent(id)}/`);
};
