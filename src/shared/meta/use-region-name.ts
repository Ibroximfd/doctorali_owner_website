"use client";

import { useCallback } from "react";

import { useMetaQuery } from "./use-meta-query";

/**
 * Hudud kodi → nomi (`meta.regions` lug'atidan). Lug'at hali kelmagan yoki kod
 * yangi bo'lsa — kodning o'zi (blok yiqilmaydi).
 */
export const useRegionName = () => {
  const regions = useMetaQuery().data?.regions;
  return useCallback(
    (code: string): string => regions?.find((region) => region.code === code)?.name ?? code,
    [regions],
  );
};
