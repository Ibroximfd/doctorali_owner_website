"use client";

import { useQuery } from "@tanstack/react-query";

import { loadMeta } from "./meta.api";

export const metaKeys = { all: ["meta"] as const };

const ONE_HOUR_MS = 60 * 60_000;

/** Filiallar va lug'atlar: soatlab o'zgarmaydi, shuning uchun uzoq kesh. */
export const useMetaQuery = () =>
  useQuery({ queryKey: metaKeys.all, queryFn: loadMeta, staleTime: ONE_HOUR_MS });
