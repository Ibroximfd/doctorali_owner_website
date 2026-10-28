import type { MockContext } from "../engine";
import { answerFor } from "./ai-answers";
import { mockError, mockResponse, type MockHandler } from "../types";

const HOUR = 3_600_000;
const iso = (ctx: MockContext, hoursAgo: number) =>
  new Date(ctx.now.getTime() - hoursAgo * HOUR).toISOString();

const FINDINGS = [
  {
    id: 88,
    category: "shortage",
    domain: "finance",
    severity: "critical",
    confidence: 86,
    verified: true,
    title: "Kuryer #12 da 3,2 mln so'm topshirilmagan naqd",
    summary:
      "21–27 okt yetkazilgan COD 14,1 mln, kassaga topshirilgan 10,9 mln. Farq 3 kundan beri kamaymayapti.",
    amount_at_risk: 3_200_000,
    evidence: [
      { label: "Yetkazilgan COD", value: "14 100 000 so'm", source: "cash.delivered_vs_collected" },
      { label: "Topshirilgan", value: "10 900 000 so'm", source: "cash.collected_vs_handed" },
    ],
    recommendation: "Kassir kuryer bilan bugun solishtiruv o'tkazsin.",
    related_checks: ["cash.delivered_vs_collected"],
  },
  {
    id: 89,
    category: "process_delay",
    domain: "sales",
    severity: "high",
    confidence: 72,
    verified: true,
    title: "Qo'qon operatorlar bo'limi 2 soatdan beri buyurtma olmayapti",
    summary: "Odatda shu vaqtda soatiga 18 ta buyurtma; 10:00 dan beri 0 ta, qo'ng'iroqlar ham yo'q.",
    amount_at_risk: null,
    evidence: [{ label: "Oxirgi buyurtma", value: "09:52", source: "operators.idle" }],
    recommendation: "Bo'lim rahbariga qo'ng'iroq qiling — internet yoki telefoniya uzilgan bo'lishi mumkin.",
    related_checks: ["operators.idle"],
  },
  {
    id: 90,
    category: "anomaly",
    domain: "warehouse",
    severity: "medium",
    confidence: 41,
    verified: false,
    title: "Samarqand omborida chiqim sotuvdan 4% ko'p",
    summary: "Sovg'alar hisobga olinmagan bo'lishi mumkin.",
    amount_at_risk: 1_800_000,
    evidence: [{ label: "Farq", value: "28 dona", source: "stock.movement_vs_sales" }],
    recommendation: "Skladchi sovg'a yozuvlarini tekshirsin.",
    related_checks: ["stock.movement_vs_sales"],
  },
] as const;

/** Holat modul ichida: baho va eskalatsiya testlarda ko'rinadi. */
const statuses = new Map<number, string>();
const issueLinks = new Map<number, number>();

const findingDto = (ctx: MockContext, seed: (typeof FINDINGS)[number]) => ({
  ...seed,
  evidence: seed.evidence.map((item) => ({ ...item })),
  related_checks: [...seed.related_checks],
  status: statuses.get(seed.id) ?? "new",
  issue_id: issueLinks.get(seed.id) ?? null,
  period_from: "2026-10-21",
  period_to: "2026-10-27",
  detected_at: iso(ctx, 2),
});

const findings = (ctx: MockContext) => {
  const all = FINDINGS.map((seed) => findingDto(ctx, seed));
  const open = all.filter((row) => row.status === "new" || row.status === "confirmed");
  return {
    counts: {
      open: open.length,
      critical: open.filter((row) => row.severity === "critical").length,
      confirmed: all.filter((row) => row.status === "confirmed").length,
      false_positive: all.filter((row) => row.status === "false_positive").length,
    },
    results: ctx.searchParams.get("status") === "all" ? all : open,
  };
};

const summary = (ctx: MockContext) => {
  const open = findings(ctx).results;
  return {
    status: "ok",
    health_score: 82,
    headline: "Kassada 1 ta farq, Qo'qon operatorlari to'xtagan — qolgani joyida",
    last_run_at: iso(ctx, 1),
    next_run_at: iso(ctx, -1),
    findings_open: open.length,
    findings_critical: open.filter((row) => row.severity === "critical").length,
    money_at_risk: open.reduce((sum, row) => sum + (row.amount_at_risk ?? 0), 0),
    checks_total: 12,
    checks_failed: 2,
    checks_warn: 1,
    cost_month_usd: 41.6,
    budget_month_usd: 150,
  };
};

const checks = (ctx: MockContext) => ({
  results: [
    [
      "cash.delivered_vs_collected",
      "Yetkazilgan COD ↔ olingan pul",
      "fail",
      14_100_000,
      10_900_000,
      "uzs",
      ["orders", "courier_cash"],
    ],
    ["operators.idle", "Operatorlar faolligi", "fail", 18, 0, "count", ["operators", "calls"]],
    ["stock.movement_vs_sales", "Ombor chiqimi ↔ sotuv", "warn", 700, 728, "count", ["warehouse", "orders"]],
    [
      "payments.gateway_vs_orders",
      "To'lov tizimi ↔ buyurtmalar",
      "pass",
      412,
      412,
      "count",
      ["payme", "orders"],
    ],
  ].map(([code, title, status, expected, actual, unit, sources]) => ({
    code,
    title,
    status,
    expected,
    actual,
    diff: Number(actual) - Number(expected),
    unit,
    sources,
    checked_at: iso(ctx, 0.2),
  })),
});

const reports = (ctx: MockContext) => ({
  results: [
    {
      id: 31,
      kind: "daily",
      period_from: "2026-10-27",
      period_to: "2026-10-27",
      created_at: iso(ctx, 6),
      health_score: 82,
      headline: "Tushum rejadan 4% yuqori, lekin kassada farq bor",
      highlights: ["Toshkent klinikasi rekord: 96 bemor"],
      risks: ["Kuryer #12 da 3,2 mln so'm"],
      actions: ["Bugun kassa solishtiruvi"],
    },
    {
      id: 30,
      kind: "weekly",
      period_from: "2026-10-20",
      period_to: "2026-10-26",
      created_at: iso(ctx, 30),
      health_score: 58,
      headline: "Samarqandda atkaz o'smoqda",
      highlights: ["Ilova DAU +12%"],
      risks: ["Samarqand atkaz 19%"],
      actions: ["Ikkinchi kuryer"],
    },
  ],
});

const recommendations = () => ({
  results: [
    {
      id: 14,
      area: "logistics",
      priority: 1,
      horizon: "week",
      effort: "low",
      title: "Samarqandga ikkinchi kuryer qo'shing",
      rationale: "So'nggi 14 kunda buyurtma 38% o'sdi, yetkazish vaqti 6 soatdan 11 soatga chiqdi.",
      expected_effect: "Atkaz 4–6 p.p. kamayishi, oyiga ~45 mln so'm qo'shimcha tushum.",
      evidence: [],
      status: "new",
    },
    {
      id: 15,
      area: "app",
      priority: 2,
      horizon: "month",
      effort: "medium",
      title: "30 kun kirmagan 2 400 foydalanuvchiga qaytish aksiyasi",
      rationale: "Kirmaganlar soni o'tgan oyga nisbatan 14% ko'p.",
      expected_effect: "~300 foydalanuvchi qaytishi, ~60 ta buyurtma.",
      evidence: [],
      status: "new",
    },
  ],
});

/* ---------- chat ---------- */

type MessageDto = {
  id: number;
  role: string;
  status: string;
  text: string;
  created_at: string;
  blocks: unknown[];
  attachments: { id: number; title: string; format: string; status: string }[];
  suggestions: string[];
};

/** Bitta tayyor suhbat bor — tarix ro'yxati va karta shartnomasi bo'sh qolmasin. */
const chats = new Map<number, { id: number; title: string; updated_at: string; messages: MessageDto[] }>([
  [
    1,
    {
      id: 1,
      title: "Kechagi hisobot",
      updated_at: "2026-10-27T21:00:00+05:00",
      messages: [
        {
          id: 2,
          role: "user",
          status: "done",
          text: "Kechagi hisobotni ber",
          created_at: "2026-10-27T21:00:00+05:00",
          blocks: [],
          attachments: [],
          suggestions: [],
        },
      ],
    },
  ],
]);
let nextId = 100;

/** Javob mazmuni savol mavzusiga qarab (`ai-answers.ts`); topilmasa — kunlik hisobot. */
const answer = (ctx: MockContext, id: number, question: string): MessageDto => ({
  id,
  role: "assistant",
  status: "done",
  created_at: ctx.now.toISOString(),
  ...answerFor(question, ctx),
});

const chatDto = (id: number) => {
  const chat = chats.get(id);
  return chat ? { ...chat, messages: chat.messages.map((message) => ({ ...message })) } : null;
};

/* ---------- avto-tuzatish ---------- */

const ACTIONS = [
  {
    id: 301,
    playbook: "order.assign_courier",
    risk: "medium",
    mode: "approve",
    status: "proposed",
    title: "Samarqanddagi 6 ta buyurtmani kuryerlarga biriktirish",
    reason: "Tasdiqlangan, 3–5 soatdan beri kuryersiz; Urgut tumanida 2 ta kuryer bo'sh",
    impact: { kind: "orders", value: 6 },
    preview: [{ label: "DA-184011", before: "kuryer yo'q", after: "Jasur Karimov" }],
    preview_more: 5,
  },
  {
    id: 300,
    playbook: "order.fix_region",
    risk: "low",
    mode: "auto",
    status: "done",
    title: "3 ta buyurtmada viloyat tuzatildi",
    reason: "Manzil Andijonda, viloyat Farg'ona deb yozilgan edi",
    impact: { kind: "orders", value: 3 },
    preview: [{ label: "DA-183990", before: "Farg'ona", after: "Andijon" }],
    preview_more: 2,
  },
] as const;

const actionStatus = new Map<number, string>();

const actionDto = (ctx: MockContext, seed: (typeof ACTIONS)[number]) => {
  const status = actionStatus.get(seed.id) ?? seed.status;
  return {
    ...seed,
    preview: seed.preview.map((row) => ({ ...row })),
    status,
    proposed_at: iso(ctx, seed.status === "done" ? 3 : 1),
    executed_at: status === "done" ? iso(ctx, 2) : null,
    undo_until: status === "done" ? iso(ctx, -22) : null,
    decided_by: status === "proposed" ? null : seed.mode === "auto" ? "AI (avto)" : "Boshliq",
  };
};

const actions = (ctx: MockContext) => {
  const all = ACTIONS.map((seed) => actionDto(ctx, seed));
  return {
    counts: { proposed: all.filter((row) => row.status === "proposed").length, auto_today: 11, undone: 1 },
    results: ctx.searchParams.get("status") === "all" ? all : all.filter((row) => row.status === "proposed"),
  };
};

const decide = (decision: string) => (ctx: MockContext) => {
  const seed = ACTIONS.find((item) => String(item.id) === ctx.params.id);
  if (!seed) return mockError(404, "action_not_found");
  actionStatus.set(seed.id, decision === "approve" ? "done" : decision === "reject" ? "rejected" : "undone");
  return actionDto(ctx, seed);
};

let autopilot = {
  enabled: true,
  playbooks: [
    {
      key: "order.fix_region",
      title: "Buyurtma viloyatini tuzatish",
      risk: "low",
      mode: "auto",
      allowed_modes: ["auto", "approve", "suggest"],
      runs_today: 7,
    },
    {
      key: "order.assign_courier",
      title: "Kuryersiz buyurtmani biriktirish",
      risk: "medium",
      mode: "approve",
      allowed_modes: ["auto", "approve", "suggest"],
      runs_today: 2,
    },
    {
      key: "stock.reorder_draft",
      title: "Ta'minotchiga buyurtma qoralamasi",
      risk: "high",
      mode: "approve",
      allowed_modes: ["approve", "suggest"],
      runs_today: 0,
    },
  ],
};

export const aiHandlers: MockHandler[] = [
  { method: "GET", path: "ai/actions/", resolve: actions },
  { method: "POST", path: "ai/actions/:id/approve/", resolve: decide("approve") },
  { method: "POST", path: "ai/actions/:id/reject/", resolve: decide("reject") },
  { method: "POST", path: "ai/actions/:id/undo/", resolve: decide("undo") },
  { method: "GET", path: "ai/autopilot/", resolve: () => autopilot },
  {
    method: "PUT",
    path: "ai/autopilot/",
    resolve: (ctx) => {
      const body = ctx.body as { enabled?: boolean; playbooks?: { key: string; mode: string }[] } | undefined;
      autopilot = {
        enabled: body?.enabled ?? autopilot.enabled,
        playbooks: autopilot.playbooks.map((playbook) => ({
          ...playbook,
          mode: body?.playbooks?.find((item) => item.key === playbook.key)?.mode ?? playbook.mode,
        })),
      };
      return autopilot;
    },
  },
  { method: "GET", path: "ai/summary/", resolve: summary },
  { method: "GET", path: "ai/findings/", resolve: findings },
  {
    method: "POST",
    path: "ai/findings/:id/feedback/",
    resolve: (ctx) => {
      const seed = FINDINGS.find((item) => String(item.id) === ctx.params.id);
      if (!seed) return mockError(404, "finding_not_found");
      statuses.set(seed.id, (ctx.body as { verdict?: string } | undefined)?.verdict ?? "confirmed");
      return findingDto(ctx, seed);
    },
  },
  {
    method: "POST",
    path: "ai/findings/:id/escalate/",
    resolve: (ctx) => {
      const id = Number(ctx.params.id);
      if (!issueLinks.has(id)) issueLinks.set(id, 600 + id);
      return { issue_id: issueLinks.get(id) };
    },
  },
  { method: "GET", path: "ai/checks/", resolve: checks },
  { method: "GET", path: "ai/reports/", resolve: reports },
  { method: "GET", path: "ai/recommendations/", resolve: recommendations },
  {
    method: "GET",
    path: "ai/chats/",
    resolve: () => ({
      results: [...chats.values()].map(({ id, title, updated_at }) => ({ id, title, updated_at })),
    }),
  },
  {
    method: "POST",
    path: "ai/chats/",
    resolve: (ctx) => {
      const id = nextId++;
      chats.set(id, { id, title: "Yangi suhbat", updated_at: ctx.now.toISOString(), messages: [] });
      return chatDto(id);
    },
  },
  {
    method: "GET",
    path: "ai/chats/:id/",
    resolve: (ctx) => {
      const chat = chatDto(Number(ctx.params.id));
      if (!chat) return mockError(404, "chat_not_found");
      // Kutilayotgan javob keyingi so'rovda tayyor bo'ladi (asinxron AI ga o'xshab).
      const stored = chats.get(chat.id);
      if (stored)
        stored.messages = stored.messages.map((message, index, all) =>
          message.status === "pending" ? answer(ctx, message.id, all[index - 1]?.text ?? "") : message,
        );
      return chat;
    },
  },
  {
    method: "POST",
    path: "ai/chats/:id/messages/",
    resolve: (ctx) => {
      const chat = chats.get(Number(ctx.params.id));
      if (!chat) return mockError(404, "chat_not_found");
      const text = (ctx.body as { text?: string } | undefined)?.text?.trim() ?? "";
      if (!text) return mockError(400, "empty_message");
      const message: MessageDto = {
        id: nextId++,
        role: "user",
        status: "done",
        text,
        created_at: ctx.now.toISOString(),
        blocks: [],
        attachments: [],
        suggestions: [],
      };
      const reply: MessageDto = { ...message, id: nextId++, role: "assistant", status: "pending", text: "" };
      chat.messages.push(message, reply);
      chat.title = text.slice(0, 40);
      chat.updated_at = ctx.now.toISOString();
      return mockResponse(202, { message, reply });
    },
  },
];
