"use client";

import { useQuery } from "@tanstack/react-query";

import { useScopeQuery } from "@/shared/hooks/use-scope";

import { loadProducts } from "../api/products.api";

export const productKeys = {
  all: ["products"] as const,
  list: (scope: readonly string[]) => [...productKeys.all, "list", ...scope] as const,
};

/** Sahifaning uchala bloki (KPI, jadval, toifalar) shu bitta so'rovdan oladi. */
export const useProductsQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: productKeys.list(key), queryFn: () => loadProducts(params), ...options });
};
