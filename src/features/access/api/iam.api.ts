import { parseJson } from "@/shared/lib/envelope";
import { apiGet, apiSend } from "@/shared/lib/http";

import { grantDiff } from "../model/iam.rules";
import {
  accountDetailSchema,
  accountSchema,
  accountsSchema,
  departmentsSchema,
  permissionsSchema,
  rolesSchema,
  type Account,
  type AccountDetail,
  type AccountInput,
  type Department,
  type PermissionDef,
  type RoleTemplate,
} from "../model/iam.schema";

export const loadDepartments = async (): Promise<Department[]> =>
  parseJson(departmentsSchema, await apiGet("iam/departments/")).results;

export const loadPermissions = async (): Promise<PermissionDef[]> =>
  parseJson(permissionsSchema, await apiGet("iam/permissions/")).results;

export const loadRoles = async (): Promise<RoleTemplate[]> =>
  parseJson(rolesSchema, await apiGet("iam/roles/")).results;

export const loadAccounts = async (department: string | null, search: string): Promise<Account[]> =>
  parseJson(accountsSchema, await apiGet("iam/accounts/", { department: department ?? undefined, search }))
    .results;

export const loadAccount = async (id: number): Promise<AccountDetail> =>
  parseJson(accountDetailSchema, await apiGet(`iam/accounts/${id}/`));

const toBody = (input: AccountInput, template: readonly string[]) => ({
  full_name: input.fullName.trim(),
  phone: input.phone.replace(/\s/g, ""),
  department: input.department,
  title: input.title.trim(),
  role: input.role,
  ...grantDiff(template, input.permissions),
  scope: input.scope,
  expires_at: input.expiresAt,
  requires_2fa: input.requires2fa,
  note: input.note?.trim() || null,
});

export const createAccount = async (input: AccountInput, template: readonly string[]): Promise<Account> =>
  parseJson(
    accountSchema,
    await apiSend("post", "iam/accounts/", { ...toBody(input, template), invite_via: input.inviteVia }),
  );

export const updateAccount = async (
  id: number,
  input: AccountInput,
  template: readonly string[],
): Promise<Account> => {
  const { phone: _phone, ...patch } = toBody(input, template);
  return parseJson(accountSchema, await apiSend("patch", `iam/accounts/${id}/`, patch));
};

export type AccountCommand = "block" | "unblock" | "reset-password" | "revoke-sessions";

export const runAccountCommand = async (
  id: number,
  command: AccountCommand,
  reason?: string,
): Promise<unknown> => apiSend("post", `iam/accounts/${id}/${command}/`, reason ? { reason } : {});
