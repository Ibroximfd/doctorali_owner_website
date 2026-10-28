"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";

import {
  grantAccess,
  loadActivity,
  loadCandidates,
  loadMembers,
  loadTemplates,
  revokeAccess,
  updateAccess,
} from "../api/access.api";
import type { GrantInput } from "../model/access.schema";

export const accessKeys = {
  all: ["access"] as const,
  members: () => [...accessKeys.all, "members"] as const,
  candidates: (search: string) => [...accessKeys.all, "candidates", search] as const,
  templates: () => [...accessKeys.all, "templates"] as const,
  activity: () => [...accessKeys.all, "activity"] as const,
};

export const useMembersQuery = () => useQuery({ queryKey: accessKeys.members(), queryFn: loadMembers });

export const useCandidatesQuery = (search: string, enabled: boolean) =>
  useQuery({
    queryKey: accessKeys.candidates(search),
    queryFn: () => loadCandidates(search),
    enabled,
    placeholderData: (previous) => previous,
  });

export const useTemplatesQuery = () =>
  useQuery({ queryKey: accessKeys.templates(), queryFn: loadTemplates, staleTime: 60 * 60_000 });

export const useActivityQuery = () =>
  useQuery({ queryKey: accessKeys.activity(), queryFn: loadActivity, refetchInterval: 60_000 });

const useInvalidateAccess = () => {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: accessKeys.all });
};

/** `memberId = null` — yangi ruxsat, aks holda mavjudini o'zgartirish. */
export const useSaveAccess = (memberId: number | null) => {
  const invalidate = useInvalidateAccess();
  return useMutation({
    mutationFn: (input: GrantInput) =>
      memberId === null ? grantAccess(input) : updateAccess(memberId, input),
    onSuccess: invalidate,
  });
};

export const useRevokeAccess = () => {
  const invalidate = useInvalidateAccess();
  return useMutation({ mutationFn: revokeAccess, onSuccess: invalidate });
};

/** Forma `?grant=new` yoki `?grant=<id>` bilan ochiladi. */
export const useGrantDrawer = () => {
  const [grant, setGrant] = useQueryState("grant", parseAsString.withOptions({ history: "push" }));
  const memberId = grant !== null && grant !== "new" ? Number(grant) : null;
  return {
    isOpen: grant !== null,
    memberId: memberId !== null && Number.isInteger(memberId) ? memberId : null,
    openNew: () => void setGrant("new"),
    openEdit: (id: number) => void setGrant(String(id)),
    close: () => void setGrant(null),
  };
};
