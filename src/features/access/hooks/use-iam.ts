"use client";

import { skipToken, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import {
  createAccount,
  loadAccount,
  loadAccounts,
  loadDepartments,
  loadPermissions,
  loadRoles,
  runAccountCommand,
  updateAccount,
  type AccountCommand,
} from "../api/iam.api";
import type { AccountInput } from "../model/iam.schema";

const HOUR = 60 * 60_000;

export const iamKeys = {
  all: ["iam"] as const,
  departments: () => [...iamKeys.all, "departments"] as const,
  permissions: () => [...iamKeys.all, "permissions"] as const,
  roles: () => [...iamKeys.all, "roles"] as const,
  accounts: (department: string | null, search: string) =>
    [...iamKeys.all, "accounts", department, search] as const,
  account: (id: number | null) => [...iamKeys.all, "account", id] as const,
};

export const ACCESS_TABS = ["panel", "accounts"] as const;

/** Varaq va ochiq akkaunt URL da: `?tab=accounts&account=new|<id>`. */
export const useAccessTab = () => {
  const [state, setState] = useQueryStates({
    tab: parseAsStringLiteral(ACCESS_TABS).withDefault("panel"),
    account: parseAsString.withOptions({ history: "push" }),
  });
  const accountId = state.account !== null && state.account !== "new" ? Number(state.account) : null;
  return {
    tab: state.tab,
    setTab: (tab: (typeof ACCESS_TABS)[number]) => void setState({ tab: tab === "panel" ? null : tab }),
    isAccountOpen: state.account !== null,
    accountId: accountId !== null && Number.isInteger(accountId) ? accountId : null,
    openNewAccount: () => void setState({ account: "new" }),
    openAccount: (id: number) => void setState({ account: String(id) }),
    closeAccount: () => void setState({ account: null }),
  };
};

export const useDepartmentsQuery = () =>
  useQuery({ queryKey: iamKeys.departments(), queryFn: loadDepartments });
export const usePermissionsQuery = () =>
  useQuery({ queryKey: iamKeys.permissions(), queryFn: loadPermissions, staleTime: HOUR });
export const useRolesQuery = () =>
  useQuery({ queryKey: iamKeys.roles(), queryFn: loadRoles, staleTime: HOUR });

export const useAccountsQuery = (department: string | null, search: string) =>
  useQuery({
    queryKey: iamKeys.accounts(department, search),
    queryFn: () => loadAccounts(department, search),
    placeholderData: (previous) => previous,
  });

export const useAccountQuery = (id: number | null) =>
  useQuery({ queryKey: iamKeys.account(id), queryFn: id === null ? skipToken : () => loadAccount(id) });

/** Matritsa uchun bir nechta akkaunt tafsiloti (shablondan qo'shilgan/olingan); kesh drawer bilan umumiy. */
export const useAccountDetails = (ids: readonly number[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: iamKeys.account(id),
      queryFn: () => loadAccount(id),
      staleTime: 5 * 60_000,
    })),
  });

const useInvalidate = () => {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: iamKeys.all });
};

export const useSaveAccount = (id: number | null) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ input, template }: { input: AccountInput; template: readonly string[] }) =>
      id === null ? createAccount(input, template) : updateAccount(id, input, template),
    onSuccess: invalidate,
  });
};

export const useAccountCommand = (id: number) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ command, reason }: { command: AccountCommand; reason?: string }) =>
      runAccountCommand(id, command, reason),
    onSuccess: invalidate,
  });
};
