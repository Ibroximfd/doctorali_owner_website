"use client";

import { keepPreviousData } from "@tanstack/react-query";
import {
  createSerializer,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useMemo } from "react";

import {
  COMPARE_MODES,
  DEFAULT_SCOPE,
  PERIOD_KEYS,
  includesToday,
  paramsKey,
  scopeKey,
  scopeToParams,
  tashkentDate,
  toggleFilialFocus,
  withoutFilial,
  type CompareMode,
  type PeriodKey,
  type Scope,
} from "@/shared/lib/scope";

const parsers = {
  period: parseAsStringLiteral(PERIOD_KEYS).withDefault(DEFAULT_SCOPE.period),
  from: parseAsString,
  to: parseAsString,
  filial: parseAsArrayOf(parseAsInteger).withDefault([]),
  compare: parseAsStringLiteral(COMPARE_MODES).withDefault(DEFAULT_SCOPE.compare),
};

const serialize = createSerializer(parsers);

/**
 * Ichki havola manzili: joriy filtr (davr · filial · taqqoslash) query sifatida
 * qo'shiladi, shunda bo'limdan bo'limga o'tganda tanlov saqlanadi.
 */
export const useScopedHref = (): ((href: string) => string) => {
  const [state] = useQueryStates(parsers);
  return (href) => serialize(href, state);
};

/** Global filtr holati (URL da). Yozish — `replace`: har filtr bosilishi tarixni to'ldirmasin. */
export const useScope = () => {
  const [state, setState] = useQueryStates(parsers, { history: "replace" });

  const scope: Scope = useMemo(
    () => ({
      period: state.period,
      from: state.from,
      to: state.to,
      filials: state.filial,
      compare: state.compare,
    }),
    [state.period, state.from, state.to, state.filial, state.compare],
  );

  return {
    scope,
    setPeriod: (period: Exclude<PeriodKey, "custom">) => setState({ period, from: null, to: null }),
    setRange: (from: string, to: string) => setState({ period: "custom", from, to }),
    setFilials: (filials: number[]) => setState({ filial: filials }),
    setCompare: (compare: CompareMode) => setState({ compare }),
  };
};

const LIVE_STALE_MS = 60_000;
const HISTORY_STALE_MS = 10 * 60_000;

/**
 * Scope ga bog'liq so'rovlar uchun umumiy to'plam: API parametrlari, kalit
 * bo'lagi va kesh qoidalari. Filtr o'zgarganda skeleton chiqmaydi — oldingi
 * natija turadi (`keepPreviousData`), joylashuv sakramaydi.
 */
export const useScopeQuery = () => {
  const { scope } = useScope();
  const today = tashkentDate(new Date());

  return useMemo(() => {
    const live = includesToday(scope, today);
    return {
      scope,
      params: scopeToParams(scope, today),
      key: scopeKey(scope, today),
      options: {
        staleTime: live ? LIVE_STALE_MS : HISTORY_STALE_MS,
        refetchInterval: live ? LIVE_STALE_MS : (false as const),
        placeholderData: keepPreviousData,
      },
    };
  }, [scope, today]);
};

/**
 * Filialga "kirish": filiallar ro'yxatidagi qator bosilsa butun panel shu
 * filialga torayadi (global filtr), yana bosilsa — barcha filiallarga qaytadi.
 */
export const useFilialFocus = () => {
  const { scope, setFilials } = useScope();

  return {
    hasFocus: scope.filials.length > 0,
    isFocused: (id: number) => scope.filials.includes(id),
    toggle: (id: number) => void setFilials(toggleFilialFocus(scope.filials, id)),
    clear: () => void setFilials([]),
  };
};

/**
 * Filiallarni o'zaro taqqoslaydigan so'rovlar uchun: davr va taqqoslash amal
 * qiladi, filial filtri esa yo'q — filial tanlanganda ham ro'yxat to'liq qoladi
 * va so'rov qayta yuborilmaydi.
 */
export const useAllFilialsQuery = () => {
  const { params, options } = useScopeQuery();

  return useMemo(() => {
    const unfiltered = withoutFilial(params);
    return { params: unfiltered, key: paramsKey(unfiltered), options };
  }, [params, options]);
};
