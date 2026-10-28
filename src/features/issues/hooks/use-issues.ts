"use client";

import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { loadIssue, loadIssues, loadRecipients, notifyIssue, type IssuesFilter } from "../api/issues.api";
import type { NotifyRequest } from "../model/issues.schema";

/** Muammolar jonli: yarim daqiqada yangilanadi (backend har 5 daqiqada aniqlaydi, holat esa tez o'zgaradi). */
const LIVE_MS = 30_000;

export const issuesKeys = {
  all: ["issues"] as const,
  list: (filter: IssuesFilter) => [...issuesKeys.all, "list", filter.status, filter.domain] as const,
  detail: (id: number | null) => [...issuesKeys.all, "detail", id] as const,
  recipients: (domain: string | null) => [...issuesKeys.all, "recipients", domain] as const,
};

/** Taxta hamma muammoni bir marta oladi; holat guruhi va yo'nalish mijozda ajratiladi. */
export const ALL_ISSUES: IssuesFilter = { status: "all", domain: null };

export const useIssuesQuery = (filter: IssuesFilter) =>
  useQuery({
    queryKey: issuesKeys.list(filter),
    queryFn: () => loadIssues(filter),
    refetchInterval: LIVE_MS,
    placeholderData: (previous) => previous,
  });

export const useIssueQuery = (id: number | null, enabled: boolean) =>
  useQuery({
    queryKey: issuesKeys.detail(id),
    queryFn: id === null ? skipToken : () => loadIssue(id),
    enabled,
    refetchInterval: enabled ? LIVE_MS : false,
  });

export const useRecipientsQuery = (domain: string | null, enabled: boolean) =>
  useQuery({
    queryKey: issuesKeys.recipients(domain),
    queryFn: domain === null ? skipToken : () => loadRecipients(domain),
    enabled,
    staleTime: 5 * 60_000,
  });

/** Xabar yuborilgach ro'yxat va karta yangilanadi (holat «xabar berildi», tarixga yozuv). */
export const useNotifyIssue = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: NotifyRequest) => notifyIssue(id, request),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: issuesKeys.all }),
  });
};
