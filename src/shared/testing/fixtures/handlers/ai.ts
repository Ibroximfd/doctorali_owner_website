import type { MockContext } from "../engine";
import { codeOf, filialsState } from "../structure-v2";
import { mockError, mockResponse, type MockHandler } from "../types";
import { answerFor } from "./ai-answers";

/**
 * Owner AI (`API_QOLLANMA` §6.8, TZ 32 §I, §C-2): `status/`, `analysis/` (GET — saqlangan,
 * POST — «Yangilash»), `chats/*` (tarixli suhbatlar), `drafts/*` (AI loyihalari, faqat tasdiq bilan
 * yuboriladi), `usage/`, eski `chat/`. Holat server xotirasida.
 *
 * `DEMO_AI_KEY = false` — **kalitsiz rejim** (hozirgi prod): tahlil `ai_available: false` va
 * xulosasiz, `POST analysis/` va chat xabari `503 ai_unavailable` (tahlil bloki xato tanasida).
 */
export const DEMO_AI_KEY = true;
const MODEL = "claude-opus-5";

const HOUR = 3_600_000;
const iso = (ctx: MockContext, hoursAgo: number) =>
  new Date(ctx.now.getTime() - hoursAgo * HOUR).toISOString();

const SEEDS = [
  {
    id: 88,
    ownerRole: "logistics",
    category: "reconciliation",
    domain: "finance",
    severity: "critical",
    confidence: 88,
    verified: true,
    title: "Janub bosh kuryeri T2 ga pulni 3 kunda bir topshirmoqda",
    summary:
      "Farhod Normatov (Janub) T2 zakazlari pulining 38% ini o'zida ushlab turibdi. Boshqa bosh kuryerlar har kuni topshiradi.",
    amount_at_risk: 12_600_000,
    evidence: [
      { label: "Bosh kuryerda turibdi", value: "38%", source: "finance.chiefs" },
      { label: "Oxirgi topshiriq", value: "3 kun oldin", source: "finance.handovers" },
    ],
    recommendation: "T2 B.L i Otabek Qodirov bugun Janub bosh kuryeridan to'liq summani qabul qilsin.",
  },
  {
    id: 89,
    ownerRole: "sales",
    category: "anomaly",
    domain: "analytics",
    severity: "high",
    confidence: 81,
    verified: true,
    title: "T2 konversiyasi boshqa filiallardan 6 f.p. past",
    summary: "T2 da konversiya 27,2%, Q da 33,8%, T1 da 32,8%. Atkaz ham T2 da eng yuqori — 14,3%.",
    amount_at_risk: null,
    evidence: [
      { label: "T2 konversiya", value: "27,2%", source: "analytics.filials" },
      { label: "T2 atkaz", value: "14,3%", source: "analytics.filials" },
    ],
    recommendation:
      "B.O Nigora Saidova Feruza Olimovaning qo'ng'iroqlarini tinglab, skriptni Q dagi bilan solishtirsin.",
  },
  {
    id: 90,
    category: "shortage",
    domain: "warehouse",
    severity: "high",
    confidence: 92,
    verified: true,
    title: "Janub skladida Kardiomed 24 dona qoldi (minimal 60)",
    summary: "Kunlik chiqim ~8 dona — 3 kunga yetadi. Kardiomed dopuski Q filialida.",
    amount_at_risk: 11_000_000,
    evidence: [
      { label: "Qoldiq", value: "24 dona", source: "warehouse.stock" },
      { label: "Minimal", value: "60 dona", source: "warehouse.stock" },
    ],
    recommendation: "Q B.L i Sardor Aliyev Janub skladiga kirim rejalashtirsin.",
  },
  {
    id: 91,
    ownerRole: "logistics",
    category: "process_delay",
    domain: "filials",
    severity: "medium",
    confidence: 70,
    verified: false,
    title: "T2 B.L ida sklad dopuski yo'q, lekin T2 ga 2 ta mahsulot berilgan",
    summary:
      "Diabefit va Neyrovit T2 ga berilgan, ammo Otabek Qodirov «Dopuskli mahsulotlar qoldig'i» huquqisiz.",
    amount_at_risk: null,
    evidence: [{ label: "B.L dopusklari", value: "3 ta", source: "filials.leaders" }],
    recommendation: "Filiallar bo'limida T2 B.L iga sklad dopuskini bering.",
  },
  {
    id: 92,
    ownerRole: "logistics",
    category: "process_delay",
    domain: "staff",
    severity: "medium",
    confidence: 64,
    verified: false,
    title: "T2 logisti zakazni bosh kuryerga 31 daqiqada biriktirmoqda",
    summary: "Q va T1 da o'rtacha 14–22 daqiqa. Kechikkan topshiriqlar 12%.",
    amount_at_risk: null,
    evidence: [{ label: "O'rtacha biriktirish", value: "31 daq", source: "staff.logists" }],
    recommendation: "Avto-taqsimlashni T2 da yoqishni ko'rib chiqing.",
  },
  {
    id: 93,
    category: "data_error",
    domain: "warehouse",
    severity: "low",
    confidence: 77,
    verified: true,
    title: "Prostavit hech bir filialga berilmagan",
    summary: "Mahsulot hamma skladda bor, lekin uning qoldig'ini hech qaysi filial logisti boshqarmaydi.",
    amount_at_risk: null,
    evidence: [{ label: "Dopusk", value: "yo'q", source: "warehouse.grants" }],
    recommendation: "Sklad bo'limida Prostavitni bitta filialga bering.",
  },
] as const;

const SEVERITY: Record<string, "urgent" | "attention" | "good"> = {
  critical: "urgent",
  high: "urgent",
  medium: "attention",
  low: "attention",
};
const ORDER = ["urgent", "attention", "good"];

const t2Id = (): number | null => filialsState().find((filial) => codeOf(filial) === "T2")?.id ?? null;

/** TZ shakli: `severity` — `attention | good`, asl daraja (`urgent`) — `source_severity` da. */
const findingDto = (seed: (typeof SEEDS)[number]) => {
  const level = SEVERITY[seed.severity] ?? "attention";
  const ownerRole = "ownerRole" in seed ? seed.ownerRole : null;
  return {
    kind: seed.category,
    severity: level === "urgent" ? "attention" : level,
    source_severity: level,
    code: `${seed.domain}.${seed.category}`,
    area: seed.domain,
    title: seed.title,
    detail: seed.summary,
    recommendation: seed.recommendation,
    owner_role: ownerRole,
    filial_id: ownerRole ? t2Id() : null,
    metric: seed.category,
  };
};

const GOOD = [
  {
    kind: "handover",
    severity: "good",
    source_severity: "good",
    code: "finance.handover_on_time",
    area: "finance",
    title: "Q va T1 bosh kuryerlardan pulni har kuni oladi",
    title_ru: "Q и T1 ежедневно получают деньги от старших курьеров",
    detail: "Oxirgi 7 kunda Q va T1 topshiriqlarining hammasi o'z vaqtida.",
    detail_ru: "За последние 7 дней все сдачи Q и T1 — вовремя.",
    recommendation: "",
    owner_role: "logistics",
    filial_id: null,
    metric: "handover_delay",
  },
];

const SUMMARY =
  "1. Pul va sotuv joyida, lekin T2 orqada.\n2. Janub bosh kuryeri T2 pulini 3 kunda bir topshirmoqda.\n3. T2 konversiyasi boshqalardan 6 f.p. past.\n4. Janub skladida Kardiomed 3 kunga yetadi.\n5. Prostavit hech bir filialga berilmagan.";
const SUMMARY_RU =
  "1. Деньги и продажи в норме, но T2 отстаёт.\n2. Старший курьер Юга сдаёт деньги T2 раз в 3 дня.\n3. Конверсия T2 на 6 п.п. ниже остальных.\n4. На складе Юг Кардиомеда хватит на 3 дня.\n5. Проставит не выдан ни одному филиалу.";

const PERIOD_DAYS: Record<string, number> = { "7d": 7, "14d": 14, "30d": 30, "60d": 60, "90d": 90 };
const DAY = 24 * HOUR;

const periodOf = (ctx: MockContext, key: string) => {
  const to = ctx.today;
  const from = new Date(new Date(`${to}T00:00:00Z`).getTime() - ((PERIOD_DAYS[key] ?? 30) - 1) * DAY)
    .toISOString()
    .slice(0, 10);
  return { from, to, date_from: from, date_to: to };
};

type Saved = { generatedAt: string; withAi: boolean };

/** Saqlangan tahlillar (davr → qachon). 30 kunligi oldindan bor — demo bo'sh ochilmasin. */
const state = {
  saved: new Map<string, Saved>(),
  seeded: false,
  chats: [] as ChatRow[],
  messages: new Map<number, MessageRow[]>(),
  drafts: [] as DraftRow[],
  nextId: 1000,
  usage: { calls: 0, input: 0, output: 0 },
};

type ChatRow = {
  id: number;
  title: string | null;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  is_deleted: boolean;
};
type MessageRow = {
  id: number;
  role: "user" | "assistant";
  text: string;
  lang: string;
  model: string | null;
  tools_used: string[];
  created_at: string;
};
type DraftRow = {
  id: number;
  filial: { id: number; name: string } | null;
  owner_role: string;
  text: string;
  status: "draft" | "sent" | "discarded";
  created_at: string;
  sent_at: string | null;
  message_id: number | null;
};

const nextId = () => (state.nextId += 1);

const seed = (ctx: MockContext) => {
  if (state.seeded) return;
  state.seeded = true;
  state.saved.set("30d", { generatedAt: iso(ctx, 0.2), withAi: DEMO_AI_KEY });
  const chat: ChatRow = {
    id: 3,
    title: "Atkaz nega oshdi?",
    message_count: 2,
    last_message_at: iso(ctx, 20),
    created_at: iso(ctx, 21),
    is_deleted: false,
  };
  state.chats.push(chat);
  const reply = answerFor("Qaysi filial va operatorning konversiyasi past, atkaz qayerda ko'p?", ctx);
  state.messages.set(chat.id, [
    {
      id: 10,
      role: "user",
      text: "Atkaz nega oshdi?",
      lang: "uz",
      model: null,
      tools_used: [],
      created_at: iso(ctx, 21),
    },
    {
      id: 11,
      role: "assistant",
      text: reply.answer,
      lang: "uz",
      model: MODEL,
      tools_used: reply.tools_used,
      created_at: iso(ctx, 20),
    },
  ]);
  const t2 = filialsState().find((filial) => codeOf(filial) === "T2") ?? filialsState()[0];
  const filial = t2 ? { id: t2.id, name: t2.name } : null;
  state.drafts.push(
    {
      id: 5,
      filial,
      owner_role: "logistics",
      text: "Janub bosh kuryeri T2 pulini 3 kunda bir topshirmoqda — bugun to'liq summani qabul qiling va sababini yozing.",
      status: "draft",
      created_at: iso(ctx, 3),
      sent_at: null,
      message_id: null,
    },
    {
      id: 6,
      filial,
      owner_role: "sales",
      text: "T2 konversiyasi boshqalardan 6 f.p. past — qo'ng'iroqlarni tinglab, skriptni Q dagi bilan solishtiring.",
      status: "draft",
      created_at: iso(ctx, 2),
      sent_at: null,
      message_id: null,
    },
  );
};

const analysisBody = (ctx: MockContext, key: string) => {
  const saved = state.saved.get(key);
  const withAi = saved?.withAi === true;
  const findings = [...SEEDS.filter((item) => item.domain !== "warehouse").map(findingDto), ...GOOD].sort(
    (a, b) => ORDER.indexOf(a.source_severity) - ORDER.indexOf(b.source_severity),
  );
  return {
    status: saved ? "ready" : "empty",
    period: periodOf(ctx, key),
    period_key: key,
    period_from: periodOf(ctx, key).from,
    period_to: periodOf(ctx, key).to,
    generated_at: saved?.generatedAt ?? iso(ctx, 0),
    summary: withAi ? SUMMARY : null,
    summary_ru: withAi ? SUMMARY_RU : null,
    ai_summary: withAi ? SUMMARY : null,
    findings,
    warehouse_findings: SEEDS.filter((item) => item.domain === "warehouse").map(findingDto),
    model: withAi ? MODEL : null,
    ai_available: DEMO_AI_KEY,
    ai_used: withAi,
  };
};

const periodParam = (raw: unknown) => {
  const key = typeof raw === "string" && raw !== "" ? raw : "30d";
  return key in PERIOD_DAYS ? key : null;
};

const getAnalysis = (ctx: MockContext) => {
  seed(ctx);
  const key = periodParam(ctx.searchParams.get("period"));
  if (key === null) return mockError(400, "validation_error", "Noma'lum period");
  return analysisBody(ctx, key);
};

const postAnalysis = (ctx: MockContext) => {
  seed(ctx);
  const body = ctx.body as { period?: unknown } | undefined;
  const key = periodParam(body?.period);
  if (key === null) return mockError(400, "validation_error", "Noma'lum period");
  state.saved.set(key, { generatedAt: iso(ctx, 0), withAi: DEMO_AI_KEY });
  if (!DEMO_AI_KEY)
    return mockResponse(503, {
      code: "ai_unavailable",
      detail: "AI kaliti sozlanmagan",
      analysis: analysisBody(ctx, key),
    });
  state.usage = {
    calls: state.usage.calls + 1,
    input: state.usage.input + 20_000,
    output: state.usage.output + 1500,
  };
  return analysisBody(ctx, key);
};

/* ---------- chat ---------- */

const liveChats = () => state.chats.filter((chat) => !chat.is_deleted);
const chatOf = (ctx: MockContext) => liveChats().find((chat) => String(chat.id) === ctx.params.id) ?? null;
const chatNotFound = () => mockError(404, "chat_not_found", "Suhbat topilmadi");

const listChats = (ctx: MockContext) => {
  seed(ctx);
  return {
    chats: [...liveChats()]
      .sort((a, b) => (b.last_message_at ?? b.created_at).localeCompare(a.last_message_at ?? a.created_at))
      .map(({ is_deleted: _deleted, ...chat }) => chat),
  };
};

const publicChat = ({ is_deleted: _deleted, ...chat }: ChatRow) => chat;

const createChat = (ctx: MockContext) => {
  seed(ctx);
  const body = ctx.body as { title?: unknown } | undefined;
  const chat: ChatRow = {
    id: nextId(),
    title: typeof body?.title === "string" && body.title.trim() !== "" ? body.title.trim() : null,
    message_count: 0,
    last_message_at: null,
    created_at: iso(ctx, 0),
    is_deleted: false,
  };
  state.chats.push(chat);
  state.messages.set(chat.id, []);
  return mockResponse(201, { chat: publicChat(chat) });
};

/** Backend `204` qaytaradi; namuna rejimida BFF tanasiz javob bera olmaydi — `200` + id. */
const deleteChat = (ctx: MockContext) => {
  seed(ctx);
  const chat = chatOf(ctx);
  if (!chat) return chatNotFound();
  chat.is_deleted = true;
  return { id: chat.id };
};

const DEFAULT_LIMIT = 30;

const listMessages = (ctx: MockContext) => {
  seed(ctx);
  const chat = chatOf(ctx);
  if (!chat) return chatNotFound();
  const before = Number(ctx.searchParams.get("before_id") ?? "");
  const limit = Math.min(100, Number(ctx.searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT);
  const all = state.messages.get(chat.id) ?? [];
  const older = Number.isFinite(before) && before > 0 ? all.filter((message) => message.id < before) : all;
  const page = older.slice(-limit);
  return {
    chat: publicChat(chat),
    has_more: older.length > page.length,
    oldest_id: page[0]?.id ?? null,
    messages: page,
    ai_available: DEMO_AI_KEY,
  };
};

const TEXT_MIN = 2;
const TEXT_MAX = 4000;

const postMessage = (ctx: MockContext) => {
  seed(ctx);
  const chat = chatOf(ctx);
  if (!chat) return chatNotFound();
  const body = ctx.body as { text?: unknown; lang?: unknown } | undefined;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text.length < TEXT_MIN || text.length > TEXT_MAX)
    return mockError(400, "validation_error", "Matn 2–4000 belgi oralig'ida bo'lsin");
  // Kalitsiz rejim: savol bazaga YOZILMAYDI — tarixda javobsiz savol qolmaydi.
  if (!DEMO_AI_KEY) return mockError(503, "ai_unavailable", "AI kaliti sozlanmagan");
  const lang = body?.lang === "ru" ? "ru" : "uz";
  const reply = answerFor(text, ctx);
  const at = iso(ctx, 0);
  const question: MessageRow = {
    id: nextId(),
    role: "user",
    text,
    lang,
    model: null,
    tools_used: [],
    created_at: at,
  };
  const answer: MessageRow = {
    id: nextId(),
    role: "assistant",
    text: reply.answer,
    lang,
    model: MODEL,
    tools_used: reply.tools_used,
    created_at: at,
  };
  state.messages.set(chat.id, [...(state.messages.get(chat.id) ?? []), question, answer]);
  chat.title ??= text.slice(0, 60);
  chat.message_count += 2;
  chat.last_message_at = at;
  state.usage = {
    calls: state.usage.calls + 1,
    input: state.usage.input + 9000,
    output: state.usage.output + 900,
  };
  return mockResponse(201, { chat: publicChat(chat), message: answer });
};

/* ---------- loyihalar ---------- */

const listDrafts = (ctx: MockContext) => {
  seed(ctx);
  const status = ctx.searchParams.get("status");
  return {
    drafts: state.drafts.filter((draft) => status === null || status === "" || draft.status === status),
  };
};

const draftOf = (ctx: MockContext) =>
  state.drafts.find((draft) => String(draft.id) === ctx.params.id) ?? null;

const draftConflict = (draft: DraftRow) =>
  draft.status === "sent"
    ? mockError(409, "draft_already_sent", "Loyiha allaqachon yuborilgan")
    : draft.status === "discarded"
      ? mockError(409, "draft_discarded", "Loyiha rad etilgan")
      : null;

const sendDraft = (ctx: MockContext) => {
  seed(ctx);
  const draft = draftOf(ctx);
  if (!draft) return mockError(404, "draft_not_found", "Loyiha topilmadi");
  const conflict = draftConflict(draft);
  if (conflict) return conflict;
  draft.status = "sent";
  draft.sent_at = iso(ctx, 0);
  draft.message_id = nextId();
  return mockResponse(201, { draft, message_id: draft.message_id, channel_id: 12 });
};

const discardDraft = (ctx: MockContext) => {
  seed(ctx);
  const draft = draftOf(ctx);
  if (!draft) return mockError(404, "draft_not_found", "Loyiha topilmadi");
  const conflict = draftConflict(draft);
  if (conflict) return conflict;
  draft.status = "discarded";
  return { draft };
};

/* ---------- xarajat ---------- */

const usd = (input: number, output: number) => ((input * 5 + output * 25) / 1_000_000).toFixed(6);

const usage = (ctx: MockContext) => {
  const month = ctx.searchParams.get("month") ?? ctx.today.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return mockError(400, "validation_error", "Noma'lum oy");
  const isCurrent = month === ctx.today.slice(0, 7);
  const analysis =
    isCurrent && DEMO_AI_KEY ? { calls: 2, input: 40_000, output: 3000 } : { calls: 0, input: 0, output: 0 };
  const chat =
    isCurrent && DEMO_AI_KEY
      ? {
          calls: 12 + state.usage.calls,
          input: 142_340 + state.usage.input,
          output: 17_110 + state.usage.output,
        }
      : { calls: 0, input: 0, output: 0 };
  const kinds = [
    { kind: "analysis", ...analysis },
    { kind: "chat", ...chat },
  ];
  const sum = (key: "calls" | "input" | "output") => kinds.reduce((total, row) => total + row[key], 0);
  return {
    month,
    model: MODEL,
    currency: "USD",
    calls: sum("calls"),
    input_tokens: sum("input"),
    output_tokens: sum("output"),
    cost_usd: usd(sum("input"), sum("output")),
    by_kind: kinds.map((row) => ({
      kind: row.kind,
      calls: row.calls,
      input_tokens: row.input,
      output_tokens: row.output,
      cost_usd: usd(row.input, row.output),
    })),
    limits: { rate_per_min: 10, max_tokens_chat: 2048, max_tokens_analysis: 4096 },
  };
};

/* ---------- eski tarixsiz savol ---------- */

const QUESTION_MIN = 3;
const QUESTION_MAX = 1000;

const legacyChat = (ctx: MockContext) => {
  const body = ctx.body as { question?: unknown } | undefined;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (question.length < QUESTION_MIN || question.length > QUESTION_MAX)
    return mockError(400, "validation_error", "question 3–1000 belgi oralig'ida bo'lsin");
  if (!DEMO_AI_KEY) return mockError(503, "ai_unavailable", "AI kaliti sozlanmagan");
  return { ...answerFor(question, ctx), model: MODEL };
};

export const aiHandlers: MockHandler[] = [
  {
    method: "GET",
    path: "ai/status/",
    resolve: (ctx) => {
      seed(ctx);
      return {
        enabled: DEMO_AI_KEY,
        model: DEMO_AI_KEY ? MODEL : null,
        cached_analysis_at: state.saved.get("30d")?.generatedAt ?? null,
      };
    },
  },
  { method: "GET", path: "ai/analysis/", resolve: getAnalysis },
  { method: "POST", path: "ai/analysis/", resolve: postAnalysis },
  { method: "GET", path: "ai/chats/", resolve: listChats },
  { method: "POST", path: "ai/chats/", resolve: createChat },
  { method: "DELETE", path: "ai/chats/:id/", resolve: deleteChat },
  { method: "GET", path: "ai/chats/:id/messages/", resolve: listMessages },
  { method: "POST", path: "ai/chats/:id/messages/", resolve: postMessage },
  { method: "GET", path: "ai/drafts/", resolve: listDrafts },
  { method: "POST", path: "ai/drafts/:id/send/", resolve: sendDraft },
  { method: "DELETE", path: "ai/drafts/:id/send/", resolve: discardDraft },
  { method: "GET", path: "ai/usage/", resolve: usage },
  { method: "POST", path: "ai/chat/", resolve: legacyChat },
];
