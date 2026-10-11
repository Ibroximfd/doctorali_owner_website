"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { loadAlertRules, updateAlertRule } from "../api/alerts.api";
import type { AlertRule, AlertRulePatch } from "../model/alerts.schema";
import { alertKeys } from "./alert-keys";

const FIVE_MINUTES_MS = 5 * 60_000;

export const useAlertRulesQuery = () =>
  useQuery({ queryKey: alertKeys.rules(), queryFn: loadAlertRules, staleTime: FIVE_MINUTES_MS });

/** Chegara yoki yoqilganlikni saqlaydi; javobdagi qoida keshdagi ro'yxatga joylanadi. */
export const useUpdateAlertRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, patch }: { code: string; patch: AlertRulePatch }) => updateAlertRule(code, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData<AlertRule[]>(alertKeys.rules(), (rules) =>
        rules?.map((rule) => (rule.code === updated.code ? updated : rule)),
      );
    },
  });
};
