"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsBoolean, parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import { useScopeQuery } from "@/shared/hooks/use-scope";

import { loadCourierRatings, loadLogistRatings, loadOperatorRatings } from "../api/ratings.api";
import { ACTIVITY, type RowFilters } from "../model/ratings.rules";
import { RATING_TABS, type RatingTab } from "../model/ratings.schema";

export const ratingKeys = {
  all: ["ratings"] as const,
  tab: (tab: RatingTab, scope: readonly string[]) => [...ratingKeys.all, tab, ...scope] as const,
};

/** Faqat ochiq yorliq so'raladi — qolgan ikkitasi bosilganda. */
export const useCourierRatings = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: ratingKeys.tab("couriers", key),
    queryFn: () => loadCourierRatings(params),
    ...options,
  });
};

export const useOperatorRatings = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: ratingKeys.tab("operators", key),
    queryFn: () => loadOperatorRatings(params),
    ...options,
  });
};

export const useLogistRatings = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: ratingKeys.tab("logists", key),
    queryFn: () => loadLogistRatings(params),
    ...options,
  });
};

const MIN_STARS = 1;
const MAX_STARS = 5;

/**
 * Yorliq va ro'yxat filtrlari URL da (havola ulashiladi): `?tab=operators&q=…&rated=true`,
 * kuryerda yana `region`, `active`, `min`. Yorliq almashsa filtrlar tozalanadi.
 */
export const useRatingsView = () => {
  const [state, setState] = useQueryStates(
    {
      tab: parseAsStringLiteral(RATING_TABS).withDefault("couriers"),
      q: parseAsString.withDefault(""),
      rated: parseAsBoolean.withDefault(false),
      region: parseAsString,
      active: parseAsStringLiteral(ACTIVITY).withDefault("all"),
      min: parseAsInteger,
    },
    { history: "replace" },
  );
  const minScore = state.min !== null && state.min >= MIN_STARS && state.min <= MAX_STARS ? state.min : null;
  const filters: RowFilters = {
    q: state.q,
    rated: state.rated,
    region: state.region,
    activity: state.active,
    minScore,
  };
  const reset = { q: null, rated: null, region: null, active: null, min: null };
  return {
    tab: state.tab,
    filters,
    setTab: (tab: RatingTab) => void setState({ ...reset, tab: tab === "couriers" ? null : tab }),
    setFilters: (patch: Partial<RowFilters>) =>
      void setState({
        ...("q" in patch ? { q: patch.q || null } : {}),
        ...("rated" in patch ? { rated: patch.rated || null } : {}),
        ...("region" in patch ? { region: patch.region ?? null } : {}),
        ...("activity" in patch ? { active: patch.activity === "all" ? null : patch.activity } : {}),
        ...("minScore" in patch ? { min: patch.minScore ?? null } : {}),
      }),
    clearFilters: () => void setState(reset),
  };
};
