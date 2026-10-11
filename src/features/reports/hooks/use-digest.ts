"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { loadDigest, saveDigest } from "../api/reports.api";
import { reportKeys } from "./report-keys";

/** Xabar ko'rinishidagi raqamlar bugungi kun bo'yicha — daqiqada bir yangilanadi. */
const DIGEST_STALE_MS = 60_000;

export const useDigestQuery = () =>
  useQuery({ queryKey: reportKeys.digest(), queryFn: loadDigest, staleTime: DIGEST_STALE_MS });

/** Xulosa sozlamasini saqlaydi; javob keshga joylanadi (qayta so'rovsiz). */
export const useSaveDigest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveDigest,
    onSuccess: (saved) => queryClient.setQueryData(reportKeys.digest(), saved),
  });
};
