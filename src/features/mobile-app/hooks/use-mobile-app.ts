"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";

import { useAllFilialsQuery } from "@/shared/hooks/use-scope";

import { AppError, ENDPOINT_MISSING } from "@/shared/lib/app-error";
import type { Envelope } from "@/shared/lib/envelope";

import { loadAppV2 } from "../api/mobile-app.api";
import type { AppV2 } from "../model/mobile-app.schema";
import { OPERATOR_SORTS } from "../model/mobile-app.rules";

export const appKeys = {
  all: ["app"] as const,
  v2: (scope: readonly string[]) => [...appKeys.all, "v2", ...scope] as const,
};

/**
 * Hamma blok bitta `app/v2/` so'rovidan (kesh bitta); har blok o'z bo'limini oladi. Javobda bo'lim
 * yo'q bo'lsa — blok «backend kutilmoqda» holatida, qolganlari chiziladi.
 */
const useAppSection = <Key extends keyof AppV2>(section: Key) => {
  const { params, key, options } = useAllFilialsQuery();
  return useQuery({
    queryKey: appKeys.v2(key),
    queryFn: () => loadAppV2(params),
    select: (envelope): Envelope<NonNullable<AppV2[Key]>> => {
      const data = envelope.data[section];
      if (data === null) throw new AppError("not-found", `app/v2/ ${section}`, ENDPOINT_MISSING);
      return { ...envelope, data };
    },
    ...options,
  });
};

/** Hamma blok faqat davrga bog'liq: filiallar kesimi sahifaning o'zida (filial filtri yo'q). */
export const useAppOrdersQuery = () => useAppSection("orders");
export const useAppUsersQuery = () => useAppSection("users");
export const useAppOperatorsQuery = () => useAppSection("operators");

/** Operatorlar jadvali: filial va tartib URL da (`?opFilial=2&opSort=ordered`). */
export const useOperatorView = () => {
  const [state, setState] = useQueryStates({
    opFilial: parseAsInteger,
    opSort: parseAsStringLiteral(OPERATOR_SORTS).withDefault("invited"),
  });
  return {
    filialId: state.opFilial,
    sort: state.opSort,
    setFilial: (id: number | null) => void setState({ opFilial: id }),
    setSort: (sort: (typeof OPERATOR_SORTS)[number]) =>
      void setState({ opSort: sort === "invited" ? null : sort }),
  };
};
