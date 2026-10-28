import { parseEnvelope, type Envelope } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";

import type { StaffRole } from "../model/staff.rules";
import {
  leaderboardSchema,
  profileSchema,
  teamsSchema,
  type Leaderboard,
  type StaffProfile,
  type Team,
} from "../model/staff.schema";

export const loadLeaderboard = async (
  params: QueryParams,
  role: StaffRole,
  team: number | null,
): Promise<Envelope<Leaderboard>> =>
  parseEnvelope(
    leaderboardSchema,
    await apiGet("staff/leaderboard/", { ...params, role, team: team ?? undefined }),
  );

export const loadTeams = async (params: QueryParams, role: StaffRole): Promise<Envelope<Team[]>> =>
  parseEnvelope(teamsSchema, await apiGet("staff/teams/", { ...params, role }));

export const loadStaffProfile = async (id: number, params: QueryParams): Promise<Envelope<StaffProfile>> =>
  parseEnvelope(profileSchema, await apiGet(`staff/${id}/`, params));
