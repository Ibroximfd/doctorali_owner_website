import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/** Platforma akkauntlari (`08_PLATFORM_ACCESS_AND_AI_OPS` §A). Enum maydonlar — ochiq ro'yxat. */
export const departmentsSchema = z.object({
  results: z.array(z.object({ key: z.string(), title: z.string(), accounts_count: z.number() })),
});
export type Department = Camelized<z.infer<typeof departmentsSchema>>["results"][number];

export const permissionsSchema = z.object({
  results: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      module: z.string(),
      level: z.string(),
      is_sensitive: z.boolean(),
      description: z.string().nullable(),
    }),
  ),
});
export type PermissionDef = Camelized<z.infer<typeof permissionsSchema>>["results"][number];

export const rolesSchema = z.object({
  results: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      department: z.string(),
      permissions: z.array(z.string()),
      is_system: z.boolean(),
    }),
  ),
});
export type RoleTemplate = Camelized<z.infer<typeof rolesSchema>>["results"][number];

const scopeSchema = z.object({
  filials: z.array(z.number()),
  regions: z.array(z.string()),
  warehouses: z.array(z.number()),
  teams: z.array(z.number()),
});
export type AccountScope = z.infer<typeof scopeSchema>;

export const accountSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  full_name: z.string(),
  phone: z.string().nullable(),
  department: z.string(),
  title: z.string(),
  role: z.string().nullable(),
  status: z.string(),
  permissions_count: z.number(),
  sensitive_count: z.number(),
  scope: scopeSchema,
  expires_at: z.string().nullable(),
  last_login_at: z.string().nullable(),
  created_at: z.string(),
  unused_permissions: z.array(z.string()).default([]),
});
export type Account = Camelized<z.infer<typeof accountSchema>>;

export const accountsSchema = z.object({ results: z.array(accountSchema) });

/** `GET /iam/accounts/{id}/` — + grant tafsiloti (shablon, qo'shilgan, olib tashlangan). */
export const accountDetailSchema = accountSchema.extend({
  extra: z.array(z.string()),
  denied: z.array(z.string()),
  requires_2fa: z.boolean(),
  note: z.string().nullable(),
  sessions: z.number(),
});
export type AccountDetail = Camelized<z.infer<typeof accountDetailSchema>>;

/** Forma (UI shakli). Ruxsatlar to'plami — tanlanganlar; `extra/denied` yuborishda shablondan hisoblanadi. */
export type AccountInput = {
  fullName: string;
  phone: string;
  department: string;
  title: string;
  role: string | null;
  permissions: string[];
  scope: AccountScope;
  expiresAt: string | null;
  requires2fa: boolean;
  inviteVia: string[];
  note: string | null;
};
