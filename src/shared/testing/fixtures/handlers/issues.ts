import { mockError, mockResponse, type MockHandler } from "../types";
import type { MockContext } from "../engine";

const MINUTE = 60_000;

const PEOPLE = {
  keeper: {
    id: 31,
    full_name: "Sardor Aliyev",
    role: "skladchi",
    phone: "+998901234567",
    channels: ["telegram", "sms"],
  },
  logist: {
    id: 22,
    full_name: "Malika Yusupova",
    role: "logist",
    phone: "+998935551122",
    channels: ["telegram", "sms", "app"],
  },
  cashier: { id: 18, full_name: "Dilnoza Karimova", role: "kassir", phone: null, channels: ["sms"] },
  admin: {
    id: 2,
    full_name: "Bekzod Tursunov",
    role: "admin",
    phone: "+998977770000",
    channels: ["telegram"],
  },
} as const;

type IssueSeed = {
  id: number;
  code: string;
  domain: string;
  severity: string;
  status: string;
  title: string;
  cause: string;
  impact: { kind: string; value: number } | null;
  filial: string | null;
  entity: { type: string; id: string; label: string } | null;
  responsible: (typeof PEOPLE)[keyof typeof PEOPLE] | null;
  minutesAgo: number;
  notifications: number;
};

const SEEDS: readonly IssueSeed[] = [
  {
    id: 501,
    code: "stock.critical",
    domain: "warehouse",
    severity: "critical",
    status: "open",
    title: "Toshkent omborida Mehrigiyo balzami 3 kunga yetadi",
    cause: "Kunlik chiqim 31 dona, qoldiq 84 dona; oxirgi prixod 12 kun oldin",
    impact: { kind: "money", value: 46_000_000 },
    filial: "Toshkent",
    entity: { type: "product", id: "7", label: "MB-500" },
    responsible: PEOPLE.keeper,
    minutesAgo: 40,
    notifications: 0,
  },
  {
    id: 502,
    code: "cash.overheld",
    domain: "finance",
    severity: "high",
    status: "notified",
    title: "Kuryer Jasur Karimovda 2 kundan beri 4,2 mln so'm",
    cause: "Naqd 26-oktyabrdan beri kassaga topshirilmagan",
    impact: { kind: "money", value: 4_200_000 },
    filial: "Toshkent",
    entity: { type: "courier", id: "12", label: "Jasur Karimov" },
    responsible: PEOPLE.cashier,
    minutesAgo: 180,
    notifications: 1,
  },
  {
    id: 503,
    code: "delivery.late",
    domain: "logistics",
    severity: "medium",
    status: "acknowledged",
    title: "Samarqandda 14 ta buyurtma 3 kundan beri yo'lda",
    cause: "Kuryer biriktirilgan, lekin yetkazildi belgisi yo'q",
    impact: { kind: "orders", value: 14 },
    filial: "Samarqand",
    entity: null,
    responsible: PEOPLE.logist,
    minutesAgo: 600,
    notifications: 2,
  },
  {
    id: 504,
    code: "sync.failed",
    domain: "system",
    severity: "low",
    status: "resolved",
    title: "Bitrix sinxroni 3 marta ketma-ket xato berdi",
    cause: "Bitrix webhook 504 qaytardi",
    impact: null,
    filial: null,
    entity: null,
    responsible: PEOPLE.admin,
    minutesAgo: 900,
    notifications: 1,
  },
];

/** Yozuvchi endpoint holati modul ichida — testlar «xabar berildi» ni ko'radi. */
const notified = new Map<number, number>();

const issueDto = (ctx: MockContext, seed: IssueSeed) => {
  const extra = notified.get(seed.id) ?? 0;
  const at = new Date(ctx.now.getTime() - seed.minutesAgo * MINUTE).toISOString();
  return {
    id: seed.id,
    code: seed.code,
    domain: seed.domain,
    severity: seed.severity,
    status: extra > 0 && seed.status === "open" ? "notified" : seed.status,
    title: seed.title,
    cause: seed.cause,
    impact: seed.impact,
    filial: seed.filial,
    entity: seed.entity,
    responsible: seed.responsible ? { ...seed.responsible, channels: [...seed.responsible.channels] } : null,
    detected_at: at,
    updated_at: at,
    notifications_count: seed.notifications + extra,
    last_notified_at: seed.notifications + extra > 0 ? ctx.now.toISOString() : null,
  };
};

const list = (ctx: MockContext) => {
  const status = ctx.searchParams.get("status") ?? "open";
  const domain = ctx.searchParams.get("domain");
  const all = SEEDS.map((seed) => issueDto(ctx, seed));
  const open = all.filter((issue) => issue.status !== "resolved");
  return {
    counts: {
      open: open.length,
      critical: open.filter((issue) => issue.severity === "critical").length,
      notified: all.filter((issue) => issue.status === "notified").length,
      resolved_today: all.length - open.length,
    },
    results: (status === "all" ? all : open).filter((issue) => !domain || issue.domain === domain),
  };
};

const detail = (ctx: MockContext) => {
  const seed = SEEDS.find((item) => String(item.id) === ctx.params.id);
  if (!seed) return mockError(404, "issue_not_found");
  const dto = issueDto(ctx, seed);
  return {
    ...dto,
    diagnostics: [
      { label: "Kunlik chiqim (30 kun)", value: "31,5 dona" },
      { label: "Oxirgi prixod", value: "16 okt, 600 dona" },
    ],
    timeline: [
      { at: dto.detected_at, kind: "detected", actor: null, text: null, channel: null },
      ...Array.from({ length: dto.notifications_count }, () => ({
        at: ctx.now.toISOString(),
        kind: "notified",
        actor: "Boshliq",
        text: "Iltimos, bugun tekshiring.",
        channel: "telegram",
      })),
    ],
  };
};

const recipients = () => ({
  results: Object.values(PEOPLE).map((person) => ({
    ...person,
    channels: [...person.channels],
    filial: "Toshkent",
  })),
});

const notify = (ctx: MockContext) => {
  const seed = SEEDS.find((item) => String(item.id) === ctx.params.id);
  if (!seed) return mockError(404, "issue_not_found");
  const body = (ctx.body ?? {}) as { channels?: string[]; message?: string };
  if (!body.message || !body.channels?.length) return mockError(400, "invalid_channel");
  notified.set(seed.id, (notified.get(seed.id) ?? 0) + 1);
  return mockResponse(200, {
    results: body.channels.map((channel) => ({ channel, status: channel === "sms" ? "queued" : "sent" })),
    issue: issueDto(ctx, seed),
  });
};

export const issuesHandlers: MockHandler[] = [
  { method: "GET", path: "issues/", resolve: list },
  { method: "GET", path: "issues/recipients/", resolve: recipients },
  { method: "GET", path: "issues/:id/", resolve: detail },
  { method: "POST", path: "issues/:id/notify/", resolve: notify },
];
