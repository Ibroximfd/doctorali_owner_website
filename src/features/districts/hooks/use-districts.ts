"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

import { loadDistrictChanges } from "../api/districts.api";
import type { DistrictChangeFilters } from "../model/districts.rules";

export const districtKeys = {
  all: ["districts"] as const,
  changes: (filters: DistrictChangeFilters) => [...districtKeys.all, "changes", filters] as const,
};

/** Filtrlar URL da (havola ulashiladi): `?region=fargona&district=…&from=…&to=…&page=2`. */
export const useDistrictChangeFilters = () => {
  const [state, setState] = useQueryStates(
    {
      region: parseAsString,
      district: parseAsString,
      from: parseAsString,
      to: parseAsString,
      page: parseAsInteger.withDefault(1),
    },
    { history: "replace" },
  );
  const filters: DistrictChangeFilters = {
    region: state.region,
    district: state.district,
    from: state.from,
    to: state.to,
    page: Math.max(1, state.page),
  };
  return {
    filters,
    /** Filtr o'zgarsa — birinchi sahifaga. */
    setFilter: (patch: Partial<Omit<DistrictChangeFilters, "page">>) =>
      void setState({ ...patch, page: null }),
    setPage: (page: number) => void setState({ page: page === 1 ? null : page }),
    clear: () => void setState({ region: null, district: null, from: null, to: null, page: null }),
  };
};

export const useDistrictChangesQuery = () => {
  const { filters } = useDistrictChangeFilters();
  return useQuery({
    queryKey: districtKeys.changes(filters),
    queryFn: () => loadDistrictChanges(filters),
    placeholderData: keepPreviousData,
  });
};
