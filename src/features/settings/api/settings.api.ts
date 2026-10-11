import { parseJson } from "@/shared/lib/envelope";
import { apiGet, apiSend } from "@/shared/lib/http";

import {
  accessResponseSchema,
  sessionsResponseSchema,
  targetsSchema,
  type AccessUser,
  type Session,
  type Targets,
} from "../model/settings.schema";

export const loadTargets = async (month: string): Promise<Targets> =>
  parseJson(targetsSchema, await apiGet("targets/", { month }));

/** Tana kalitlari (`month`, `items[].filial|channel|amount`) simdagi shakl bilan bir xil — aylantirish kerak emas. */
export const saveTargets = async (input: Targets): Promise<Targets> =>
  parseJson(targetsSchema, await apiSend("put", "targets/", input));

export const loadSessions = async (): Promise<Session[]> =>
  parseJson(sessionsResponseSchema, await apiGet("sessions/")).results;

/** Sessiyani uzadi. Javob tanasi ishlatilmaydi (backend `204` qaytarishi mumkin). */
export const revokeSession = async (id: string): Promise<void> => {
  await apiSend("delete", `sessions/${encodeURIComponent(id)}/`);
};

export const loadAccess = async (): Promise<AccessUser[]> =>
  parseJson(accessResponseSchema, await apiGet("settings/access/")).results;
