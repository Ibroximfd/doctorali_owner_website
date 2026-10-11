"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { loadExportStatus, loadExports, requestExport } from "../api/reports.api";
import { isExportInProgress } from "../model/reports.rules";
import { reportKeys } from "./report-keys";

const EXPORTS_STALE_MS = 60_000;

/** Tayyorlanayotgan faylning holati shu oraliqda so'raladi (tab yashirin bo'lsa to'xtaydi). */
export const EXPORT_POLL_MS = 2_000;
/** Eksport odatda soniyalarda tayyor bo'ladi; 10 daqiqadan keyin so'rash befoyda. */
const EXPORT_POLL_LIMIT_MS = 10 * 60_000;

export const useExportsQuery = () =>
  useQuery({ queryKey: reportKeys.exports(), queryFn: loadExports, staleTime: EXPORTS_STALE_MS });

/**
 * Kutilayotgan har bir ishni tayyor bo'lguncha so'rab turadi. Holat o'zgargach
 * ro'yxat serverdan qayta olinadi (havola va muddat bilan) — ish kutilayotganlar
 * orasidan chiqadi va so'rov o'zi to'xtaydi.
 */
export const useExportPolling = (jobIds: readonly string[], intervalMs: number = EXPORT_POLL_MS): void => {
  const queryClient = useQueryClient();

  useQueries({
    queries: jobIds.map((jobId) => ({
      queryKey: reportKeys.exportStatus(jobId),
      queryFn: async () => {
        try {
          const state = await loadExportStatus(jobId);
          if (!isExportInProgress(state.status))
            await queryClient.invalidateQueries({ queryKey: reportKeys.exports() });
          return state;
        } catch (error) {
          // Ish o'chirilgan yoki server xato — tarix serverdan yangilanadi, so'rash to'xtaydi.
          await queryClient.invalidateQueries({ queryKey: reportKeys.exports() });
          throw error;
        }
      },
      staleTime: 0,
      retry: 1,
      // Xatodan keyin yoki server ishni juda uzoq «kutilmoqda» da ushlasa — so'rash to'xtaydi.
      refetchInterval: (query: { state: { status: string; dataUpdateCount: number } }) =>
        query.state.status === "error" || query.state.dataUpdateCount * intervalMs > EXPORT_POLL_LIMIT_MS
          ? false
          : intervalMs,
    })),
  });
};

/** Eksport so'rovi: yangi ish tarixda ko'ringunicha tugma band turadi. */
export const useRequestExport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestExport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.exports() }),
  });
};
