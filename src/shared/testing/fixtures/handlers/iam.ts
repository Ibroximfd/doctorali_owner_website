import type { MockContext } from "../engine";
import { mockError, mockResponse, type MockHandler } from "../types";

const DEPARTMENTS = [
  { key: "warehouse", title: "Ombor" },
  { key: "call_center", title: "Call-center" },
  { key: "couriers", title: "Kuryerlar" },
  { key: "cash", title: "Kassa" },
] as const;

const PERMISSIONS = [
  ["warehouse.stock.view", "Qoldiqni ko'rish", "warehouse", "view", false],
  ["warehouse.stock.detail", "Har mahsulot va harakat", "warehouse", "detail", false],
  ["warehouse.cost.view", "Tannarx", "warehouse", "sensitive", true],
  ["warehouse.inbound.create", "Prixod kiritish", "warehouse", "act", false],
  ["warehouse.staff.manage", "Skladchilarni boshqarish", "warehouse", "manage", false],
  ["callcenter.stats.view", "Jamoa KPI", "callcenter", "view", false],
  ["callcenter.calls.detail", "Har qo'ng'iroq", "callcenter", "detail", false],
  ["callcenter.recordings.listen", "Audio yozuvni tinglash", "callcenter", "sensitive", true],
  ["callcenter.operators.manage", "Operatorlarni boshqarish", "callcenter", "manage", false],
  ["couriers.live.view", "Kuryerlar joylashuvi", "couriers", "view", false],
  ["couriers.manage", "Kuryerlarni boshqarish", "couriers", "manage", false],
] as const;

const ROLES = [
  {
    key: "warehouse_head",
    title: "Sklad boshlig'i",
    department: "warehouse",
    permissions: [
      "warehouse.stock.view",
      "warehouse.stock.detail",
      "warehouse.inbound.create",
      "warehouse.staff.manage",
      "couriers.live.view",
    ],
    is_system: true,
  },
  {
    key: "warehouse_keeper",
    title: "Skladchi",
    department: "warehouse",
    permissions: ["warehouse.stock.detail", "warehouse.inbound.create"],
    is_system: true,
  },
  {
    key: "call_center_admin",
    title: "Filial admini",
    department: "call_center",
    permissions: [
      "callcenter.stats.view",
      "callcenter.calls.detail",
      "callcenter.recordings.listen",
      "callcenter.operators.manage",
    ],
    is_system: true,
  },
  {
    key: "courier_head",
    title: "Kuryerlar boshlig'i",
    department: "couriers",
    permissions: ["couriers.live.view", "couriers.manage"],
    is_system: true,
  },
];

type AccountDto = {
  id: number;
  user_id: number;
  full_name: string;
  phone: string | null;
  department: string;
  title: string;
  role: string | null;
  status: string;
  permissions_count: number;
  sensitive_count: number;
  scope: { filials: number[]; regions: string[]; warehouses: number[]; teams: number[] };
  expires_at: string | null;
  last_login_at: string | null;
  created_at: string;
  unused_permissions: string[];
  extra: string[];
  denied: string[];
  requires_2fa: boolean;
  note: string | null;
  sessions: number;
};

let accounts: AccountDto[] | null = null;
let nextId = 60;

const seed = (ctx: MockContext): AccountDto[] => {
  accounts ??= [
    {
      id: 51,
      user_id: 31,
      full_name: "Sardor Aliyev",
      phone: "+998901234567",
      department: "warehouse",
      title: "Toshkent ombori boshlig'i",
      role: "warehouse_head",
      status: "active",
      permissions_count: 5,
      sensitive_count: 0,
      scope: { filials: [1], regions: [], warehouses: [1], teams: [] },
      expires_at: null,
      last_login_at: new Date(ctx.now.getTime() - 3_600_000).toISOString(),
      created_at: "2026-09-01T10:00:00+05:00",
      unused_permissions: ["warehouse.staff.manage"],
      extra: [],
      denied: [],
      requires_2fa: false,
      note: null,
      sessions: 2,
    },
    {
      id: 52,
      user_id: 22,
      full_name: "Malika Yusupova",
      phone: "+998935551122",
      department: "call_center",
      title: "Toshkent call-center admini",
      role: "call_center_admin",
      status: "blocked",
      permissions_count: 4,
      sensitive_count: 1,
      scope: { filials: [1], regions: [], warehouses: [], teams: [2] },
      expires_at: null,
      last_login_at: null,
      created_at: "2026-09-10T10:00:00+05:00",
      unused_permissions: [],
      extra: [],
      denied: [],
      requires_2fa: true,
      note: null,
      sessions: 0,
    },
  ];
  return accounts;
};

type Body = Partial<{
  full_name: string;
  phone: string;
  department: string;
  title: string;
  role: string | null;
  extra: string[];
  denied: string[];
  scope: AccountDto["scope"];
  requires_2fa: boolean;
}>;

const countFor = (role: string | null, extra: readonly string[], denied: readonly string[]) => {
  const template = ROLES.find((item) => item.key === role)?.permissions ?? [];
  const keys = [...new Set([...template, ...extra])].filter((key) => !denied.includes(key));
  return {
    permissions_count: keys.length,
    sensitive_count: keys.filter((key) => PERMISSIONS.some(([k, , , , sensitive]) => k === key && sensitive))
      .length,
  };
};

const listDto = (account: AccountDto) => {
  const {
    extra: _extra,
    denied: _denied,
    requires_2fa: _twoFactor,
    note: _note,
    sessions: _sessions,
    ...row
  } = account;
  return row;
};

export const iamHandlers: MockHandler[] = [
  {
    method: "GET",
    path: "iam/departments/",
    resolve: (ctx) => ({
      results: DEPARTMENTS.map((item) => ({
        ...item,
        accounts_count: seed(ctx).filter((row) => row.department === item.key).length,
      })),
    }),
  },
  {
    method: "GET",
    path: "iam/permissions/",
    resolve: () => ({
      results: PERMISSIONS.map(([key, title, module, level, isSensitive]) => ({
        key,
        title,
        module,
        level,
        is_sensitive: isSensitive,
        description: null,
      })),
    }),
  },
  {
    method: "GET",
    path: "iam/roles/",
    resolve: () => ({ results: ROLES.map((role) => ({ ...role, permissions: [...role.permissions] })) }),
  },
  {
    method: "GET",
    path: "iam/accounts/",
    resolve: (ctx) => {
      const department = ctx.searchParams.get("department");
      const search = (ctx.searchParams.get("search") ?? "").toLowerCase();
      return {
        results: seed(ctx)
          .filter((row) => !department || row.department === department)
          .filter((row) => !search || row.full_name.toLowerCase().includes(search))
          .map(listDto),
      };
    },
  },
  {
    method: "GET",
    path: "iam/accounts/:id/",
    resolve: (ctx) =>
      seed(ctx).find((row) => String(row.id) === ctx.params.id) ?? mockError(404, "account_not_found"),
  },
  {
    method: "POST",
    path: "iam/accounts/",
    resolve: (ctx) => {
      const body = (ctx.body ?? {}) as Body;
      const list = seed(ctx);
      if (list.some((row) => row.phone === body.phone)) return mockError(409, "phone_taken");
      const account: AccountDto = {
        id: nextId++,
        user_id: nextId + 100,
        full_name: body.full_name ?? "",
        phone: body.phone ?? null,
        department: body.department ?? "",
        title: body.title ?? "",
        role: body.role ?? null,
        status: "invited",
        ...countFor(body.role ?? null, body.extra ?? [], body.denied ?? []),
        scope: body.scope ?? { filials: [], regions: [], warehouses: [], teams: [] },
        expires_at: null,
        last_login_at: null,
        created_at: ctx.now.toISOString(),
        unused_permissions: [],
        extra: body.extra ?? [],
        denied: body.denied ?? [],
        requires_2fa: body.requires_2fa ?? false,
        note: null,
        sessions: 0,
      };
      list.push(account);
      return mockResponse(201, listDto(account));
    },
  },
  {
    method: "PATCH",
    path: "iam/accounts/:id/",
    resolve: (ctx) => {
      const account = seed(ctx).find((row) => String(row.id) === ctx.params.id);
      if (!account) return mockError(404, "account_not_found");
      const body = (ctx.body ?? {}) as Body;
      Object.assign(account, {
        title: body.title ?? account.title,
        role: body.role ?? account.role,
        extra: body.extra ?? account.extra,
        denied: body.denied ?? account.denied,
        scope: body.scope ?? account.scope,
        requires_2fa: body.requires_2fa ?? account.requires_2fa,
      });
      Object.assign(account, countFor(account.role, account.extra, account.denied));
      return listDto(account);
    },
  },
  ...(["block", "unblock", "reset-password", "revoke-sessions"] as const).map((command): MockHandler => ({
    method: "POST",
    path: `iam/accounts/:id/${command}/`,
    resolve: (ctx) => {
      const account = seed(ctx).find((row) => String(row.id) === ctx.params.id);
      if (!account) return mockError(404, "account_not_found");
      if (command === "block") account.status = "blocked";
      if (command === "unblock") account.status = "active";
      if (command === "revoke-sessions") account.sessions = 0;
      return mockResponse(200, { ok: true });
    },
  })),
];
