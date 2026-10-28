"use client";

import { useQuery } from "@tanstack/react-query";

import { useScopeQuery } from "@/shared/hooks/use-scope";

import {
  loadMovements,
  loadSalesMix,
  loadStock,
  loadWarehouseSummary,
  loadWarehouses,
} from "../api/warehouse.api";

export const warehouseKeys = {
  all: ["warehouse"] as const,
  summary: (scope: readonly string[]) => [...warehouseKeys.all, "summary", ...scope] as const,
  list: (scope: readonly string[]) => [...warehouseKeys.all, "list", ...scope] as const,
  stock: (warehouse: number | null, scope: readonly string[]) =>
    [...warehouseKeys.all, "stock", warehouse, ...scope] as const,
  movements: (scope: readonly string[]) => [...warehouseKeys.all, "movements", ...scope] as const,
  salesMix: (scope: readonly string[]) => [...warehouseKeys.all, "sales-mix", ...scope] as const,
};

export const useWarehouseSummaryQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: warehouseKeys.summary(key),
    queryFn: () => loadWarehouseSummary(params),
    ...options,
  });
};

export const useWarehousesQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: warehouseKeys.list(key), queryFn: () => loadWarehouses(params), ...options });
};

/** `warehouse = null` — hamma omborlar; drawer ochilganda — bitta ombor. */
export const useStockQuery = (warehouse: number | null, enabled = true) => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: warehouseKeys.stock(warehouse, key),
    queryFn: () => loadStock(params, warehouse),
    enabled,
    staleTime: options.staleTime,
    refetchInterval: options.refetchInterval,
  });
};

export const useMovementsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({
    queryKey: warehouseKeys.movements(key),
    queryFn: () => loadMovements(params),
    ...options,
  });
};

export const useSalesMixQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: warehouseKeys.salesMix(key), queryFn: () => loadSalesMix(params), ...options });
};
