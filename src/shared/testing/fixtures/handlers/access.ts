import type { MockContext } from "../engine";
import { mockError, mockResponse, type MockHandler } from "../types";

const DAY = 86_400_000;

type MemberDto = {
  id: number;
  user_id: number;
  full_name: string;
  phone: string | null;
  title: string;
  platform_role: string;
  sections: string[];
  filials: number[];
  regions: string[];
  mask_pii: boolean;
  can_export: boolean;
  expires_at: string | null;
  status: string;
  last_seen_at: string | null;
  created_at: string;
  note: string | null;
};

const CANDIDATES = [
  {
    user_id: 44,
    full_name: "Sardor Aliyev",
    phone: "+998901234567",
    platform_role: "operator_admin",
    filial: "Toshkent",
  },
  {
    user_id: 45,
    full_name: "Malika Yusupova",
    phone: "+998935551122",
    platform_role: "logist",
    filial: "Toshkent",
  },
  { user_id: 46, full_name: "Nodira Rasulova", phone: null, platform_role: "accountant", filial: null },
  {
    user_id: 47,
    full_name: "Javohir Ergashev",
    phone: "+998912223344",
    platform_role: "operator_admin",
    filial: "Qo'qon",
  },
];

/** Holat modul ichida — testlarda berish/yopish ko'rinadi. */
let members: MemberDto[] | null = null;
let nextId = 10;

const seed = (ctx: MockContext): MemberDto[] => {
  members ??= [
    {
      id: 7,
      user_id: 44,
      full_name: "Sardor Aliyev",
      phone: "+998901234567",
      title: "Call-center admini",
      platform_role: "operator_admin",
      sections: ["warehouse"],
      filials: [1],
      regions: [],
      mask_pii: true,
      can_export: false,
      expires_at: new Date(ctx.now.getTime() + 2 * DAY).toISOString(),
      status: "active",
      last_seen_at: new Date(ctx.now.getTime() - 3_600_000).toISOString(),
      created_at: new Date(ctx.now.getTime() - 20 * DAY).toISOString(),
      note: "Qoldiqni operatorlarga aytib turish uchun",
    },
    {
      id: 8,
      user_id: 45,
      full_name: "Malika Yusupova",
      phone: "+998935551122",
      title: "Logist",
      platform_role: "logist",
      sections: ["logistics", "warehouse", "issues"],
      filials: [],
      regions: [],
      mask_pii: true,
      can_export: true,
      expires_at: null,
      status: "pending",
      last_seen_at: null,
      created_at: new Date(ctx.now.getTime() - DAY).toISOString(),
      note: null,
    },
    {
      id: 6,
      user_id: 46,
      full_name: "Nodira Rasulova",
      phone: null,
      title: "Buxgalter",
      platform_role: "accountant",
      sections: ["finance"],
      filials: [],
      regions: [],
      mask_pii: false,
      can_export: true,
      expires_at: null,
      status: "revoked",
      last_seen_at: null,
      created_at: new Date(ctx.now.getTime() - 60 * DAY).toISOString(),
      note: null,
    },
  ];
  return members;
};

type Body = {
  user_id?: number;
  title?: string;
  sections?: string[];
  filials?: number[];
  regions?: string[];
  mask_pii?: boolean;
  can_export?: boolean;
  expires_at?: string | null;
  note?: string | null;
};

const isLive = (member: MemberDto) => member.status === "active" || member.status === "pending";

export const accessHandlers: MockHandler[] = [
  {
    method: "GET",
    path: "access/members/",
    resolve: (ctx) => ({ results: seed(ctx).map((row) => ({ ...row })) }),
  },
  {
    method: "GET",
    path: "access/candidates/",
    resolve: (ctx) => {
      const search = (ctx.searchParams.get("search") ?? "").toLowerCase();
      const live = seed(ctx).filter(isLive);
      return {
        results: CANDIDATES.filter(
          (person) =>
            !search ||
            person.full_name.toLowerCase().includes(search) ||
            (person.phone ?? "").includes(search),
        ).map((person) => ({
          ...person,
          has_access: live.some((member) => member.user_id === person.user_id),
        })),
      };
    },
  },
  {
    method: "GET",
    path: "access/templates/",
    resolve: () => ({
      results: [
        { key: "call_center_admin", title: "Call-center admini", sections: ["warehouse"], mask_pii: true },
        { key: "logist", title: "Logist", sections: ["logistics", "warehouse", "issues"], mask_pii: true },
        {
          key: "accountant",
          title: "Buxgalter",
          sections: ["finance", "settlements", "reports"],
          mask_pii: false,
        },
      ],
    }),
  },
  {
    method: "GET",
    path: "access/activity/",
    resolve: (ctx) => ({
      results: [
        {
          id: 3,
          at: new Date(ctx.now.getTime() - 3_600_000).toISOString(),
          member_id: 7,
          full_name: "Sardor Aliyev",
          kind: "view",
          section: "warehouse",
          detail: null,
        },
        {
          id: 2,
          at: new Date(ctx.now.getTime() - DAY).toISOString(),
          member_id: 8,
          full_name: "Malika Yusupova",
          kind: "granted",
          section: null,
          detail: null,
        },
      ],
    }),
  },
  {
    method: "POST",
    path: "access/members/",
    resolve: (ctx) => {
      const body = (ctx.body ?? {}) as Body;
      const person = CANDIDATES.find((item) => item.user_id === body.user_id);
      if (!person) return mockError(404, "user_not_found");
      if (!body.sections?.length || body.sections.includes("access"))
        return mockError(400, "invalid_section");
      const list = seed(ctx);
      if (list.some((member) => member.user_id === person.user_id && isLive(member)))
        return mockError(409, "already_granted");
      const member: MemberDto = {
        id: nextId++,
        user_id: person.user_id,
        full_name: person.full_name,
        phone: person.phone,
        title: body.title ?? "",
        platform_role: person.platform_role,
        sections: body.sections,
        filials: body.filials ?? [],
        regions: body.regions ?? [],
        mask_pii: body.mask_pii ?? true,
        can_export: body.can_export ?? false,
        expires_at: body.expires_at ? `${body.expires_at}T23:59:59+05:00` : null,
        status: "pending",
        last_seen_at: null,
        created_at: ctx.now.toISOString(),
        note: body.note ?? null,
      };
      list.push(member);
      return mockResponse(201, member);
    },
  },
  {
    method: "PATCH",
    path: "access/members/:id/",
    resolve: (ctx) => {
      const member = seed(ctx).find((row) => String(row.id) === ctx.params.id);
      if (!member) return mockError(404, "member_not_found");
      const body = (ctx.body ?? {}) as Body;
      Object.assign(member, {
        ...(body.title === undefined ? {} : { title: body.title }),
        ...(body.sections === undefined ? {} : { sections: body.sections }),
        ...(body.filials === undefined ? {} : { filials: body.filials }),
        ...(body.mask_pii === undefined ? {} : { mask_pii: body.mask_pii }),
      });
      return { ...member };
    },
  },
  {
    method: "POST",
    path: "access/members/:id/revoke/",
    resolve: (ctx) => {
      const member = seed(ctx).find((row) => String(row.id) === ctx.params.id);
      if (!member) return mockError(404, "member_not_found");
      member.status = "revoked";
      return { ...member };
    },
  },
];
