import { AppError, ENDPOINT_MISSING } from "@/shared/lib/app-error";
import type { Envelope } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";
import { parseFlexible } from "@/shared/lib/lenient";

import { salesOperatorsSchema, toLeaderboard, toProfile, toTeams } from "../model/sales-operators";
import type { StaffRole } from "../model/staff.rules";
import type { Leaderboard, StaffProfile, Team } from "../model/staff.schema";

/**
 * Xodimlar `sales/operators/` dan (B-15). Logistlar uchun backendda manba yo'q — blok
 * «backend kutilmoqda» holatida.
 */
const loadOperators = async (params: QueryParams) =>
  parseFlexible(salesOperatorsSchema, await apiGet("sales/operators/", params));

const requireOperators = (role: StaffRole) => {
  if (role === "logist") throw new AppError("not-found", "staff: logists", ENDPOINT_MISSING);
};

export const loadLeaderboard = async (
  params: QueryParams,
  role: StaffRole,
  team: number | null,
): Promise<Envelope<Leaderboard>> => {
  requireOperators(role);
  const envelope = await loadOperators(params);
  return { ...envelope, data: toLeaderboard(envelope.data, team) };
};

export const loadTeams = async (params: QueryParams, role: StaffRole): Promise<Envelope<Team[]>> => {
  requireOperators(role);
  const envelope = await loadOperators(params);
  return { ...envelope, data: toTeams(envelope.data) };
};

export const loadStaffProfile = async (id: number, params: QueryParams): Promise<Envelope<StaffProfile>> => {
  const envelope = await loadOperators(params);
  const profile = toProfile(envelope.data, id);
  if (!profile) throw new AppError("not-found", "operator_not_found", "operator_not_found");
  return { ...envelope, data: profile };
};
