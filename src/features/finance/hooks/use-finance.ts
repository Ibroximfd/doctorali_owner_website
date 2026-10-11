"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useScopeQuery } from "@/shared/hooks/use-scope";

import {
  loadCashPosition,
  loadCashflow,
  loadDailyClosings,
  loadDebts,
  loadExpenses,
  loadFinanceSummary,
  loadLiabilities,
  loadPaymentMix,
  loadReturns,
} from "../api/finance.api";

export const financeKeys = {
  all: ["finance"] as const,
  summary: (scope: readonly string[]) => [...financeKeys.all, "summary", ...scope] as const,
  cashflow: (scope: readonly string[]) => [...financeKeys.all, "cashflow", ...scope] as const,
  paymentMix: (scope: readonly string[]) => [...financeKeys.all, "payment-mix", ...scope] as const,
  expenses: (scope: readonly string[]) => [...financeKeys.all, "expenses", ...scope] as const,
  returns: (scope: readonly string[]) => [...financeKeys.all, "returns", ...scope] as const,
  debts: (scope: readonly string[]) => [...financeKeys.all, "debts", ...scope] as const,
  closings: (scope: readonly string[]) => [...financeKeys.all, "closings", ...scope] as const,
  cashPosition: (filial: string) => [...financeKeys.all, "cash-position", filial] as const,
  liabilities: (filial: string) => [...financeKeys.all, "liabilities", filial] as const,
};

export const useFinanceSummaryQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: financeKeys.summary(key),
    queryFn: () => loadFinanceSummary(params),
    ...options,
  });
};

export const useCashflowQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: financeKeys.cashflow(key), queryFn: () => loadCashflow(params), ...options });
};

export const usePaymentMixQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: financeKeys.paymentMix(key),
    queryFn: () => loadPaymentMix(params),
    ...options,
  });
};

export const useExpensesQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: financeKeys.expenses(key), queryFn: () => loadExpenses(params), ...options });
};

export const useReturnsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: financeKeys.returns(key), queryFn: () => loadReturns(params), ...options });
};

export const useDebtsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: financeKeys.debts(key), queryFn: () => loadDebts(params), ...options });
};

export const useDailyClosingsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: financeKeys.closings(key),
    queryFn: () => loadDailyClosings(params),
    ...options,
  });
};

const NOW_REFRESH_MS = 60_000;
const ALL_FILIALS = "all";

/**
 * Hozirgi holat (kassa, majburiyat) davrga bog'liq emas: so'rovga ham, kalitga
 * ham faqat filial kiradi — davr o'zgarganda bu bloklar qayta yuklanmaydi.
 */
const useNowScope = () => {
  const { filial } = useScopeQuery().params;
  return {
    params: { filial },
    key: filial ?? ALL_FILIALS,
    options: {
      staleTime: NOW_REFRESH_MS,
      refetchInterval: NOW_REFRESH_MS,
      placeholderData: keepPreviousData,
    },
  };
};

export const useCashPositionQuery = () => {
  const { params, key, options } = useNowScope();
  return useQuery({
    queryKey: financeKeys.cashPosition(key),
    queryFn: () => loadCashPosition(params),
    ...options,
  });
};

export const useLiabilitiesQuery = () => {
  const { params, key, options } = useNowScope();
  return useQuery({
    queryKey: financeKeys.liabilities(key),
    queryFn: () => loadLiabilities(params),
    ...options,
  });
};

/**
 * Kirim-chiqim grafigi ostidagi uchta ko'rsatkich uch so'rovdan yig'iladi
 * (qaytarish, yig'ilgan pul, xarajatlar). So'rovlar boshqa bloklar bilan bir
 * xil kalitda — tarmoqqa qo'shimcha murojaat bo'lmaydi.
 */
export const useFlowHighlightsQuery = () => {
  const summary = useFinanceSummaryQuery();
  const returns = useReturnsQuery();
  const expenses = useExpensesQuery();
  const parts = [summary, returns, expenses] as const;

  return {
    data:
      summary.data && returns.data && expenses.data
        ? {
            summary: summary.data.data,
            period: summary.data.period,
            returns: returns.data.data,
            expenses: expenses.data.data,
          }
        : undefined,
    error: parts.find((part) => part.error)?.error ?? null,
    isPending: parts.some((part) => part.isPending),
    isPlaceholderData: parts.some((part) => part.isPlaceholderData),
    refetch: () => Promise.all(parts.filter((part) => part.isError).map((part) => part.refetch())),
  };
};
