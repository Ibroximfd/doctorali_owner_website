"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { askAi, loadAiStatus, loadAnalysis } from "../api/ai.api";

const MINUTE = 60_000;
/** Backend tahlilni 10 daqiqa keshlaydi — tez-tez so'rash foyda bermaydi. */
const ANALYSIS_STALE_MS = 10 * MINUTE;

export const aiKeys = {
  all: ["ai"] as const,
  status: () => [...aiKeys.all, "status"] as const,
  analysis: () => [...aiKeys.all, "analysis"] as const,
};

export const useAiStatusQuery = () =>
  useQuery({ queryKey: aiKeys.status(), queryFn: loadAiStatus, staleTime: 5 * MINUTE });

export const useAnalysisQuery = () =>
  useQuery({ queryKey: aiKeys.analysis(), queryFn: () => loadAnalysis(), staleTime: ANALYSIS_STALE_MS });

/** «Yangilash» — `fresh=1`, natija keshga yoziladi. */
export const useRefreshAnalysis = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => loadAnalysis(true),
    onSuccess: (analysis) => queryClient.setQueryData(aiKeys.analysis(), analysis),
  });
};

/** Chat savoli: javob tarixi komponentda (backend suhbatni saqlamaydi — §8.3). */
export const useAskAi = () => useMutation({ mutationFn: askAi });
