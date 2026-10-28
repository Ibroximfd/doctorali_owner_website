"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";

import { useScopeQuery } from "@/shared/hooks/use-scope";

import { loadLeaderboard, loadStaffProfile, loadTeams } from "../api/staff.api";
import { STAFF_ROLES, type StaffRole } from "../model/staff.rules";

export const staffKeys = {
  all: ["staff"] as const,
  leaderboard: (role: StaffRole, team: number | null, scope: readonly string[]) =>
    [...staffKeys.all, "leaderboard", role, team, ...scope] as const,
  teams: (role: StaffRole, scope: readonly string[]) => [...staffKeys.all, "teams", role, ...scope] as const,
  profile: (id: number | null, scope: readonly string[]) =>
    [...staffKeys.all, "profile", id, ...scope] as const,
};

/** Rol, jamoa va ochiq profil URL da: `?role=courier&team=2&staff=14`. */
export const useStaffView = () => {
  const [state, setState] = useQueryStates({
    role: parseAsStringLiteral(STAFF_ROLES).withDefault("operator"),
    team: parseAsInteger,
    staff: parseAsInteger.withOptions({ history: "push" }),
  });
  return {
    role: state.role,
    team: state.team,
    staffId: state.staff,
    setRole: (role: StaffRole) => void setState({ role: role === "operator" ? null : role, team: null }),
    setTeam: (team: number | null) => void setState({ team }),
    openStaff: (id: number) => void setState({ staff: id }),
    closeStaff: () => void setState({ staff: null }),
  };
};

export const useLeaderboardQuery = () => {
  const { role, team } = useStaffView();
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: staffKeys.leaderboard(role, team, key),
    queryFn: () => loadLeaderboard(params, role, team),
    ...options,
  });
};

export const useTeamsQuery = () => {
  const { role } = useStaffView();
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: staffKeys.teams(role, key),
    queryFn: () => loadTeams(params, role),
    ...options,
  });
};

export const useStaffProfileQuery = (id: number | null, enabled: boolean) => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: staffKeys.profile(id, key),
    queryFn: id === null ? skipToken : () => loadStaffProfile(id, params),
    enabled,
    staleTime: options.staleTime,
  });
};
