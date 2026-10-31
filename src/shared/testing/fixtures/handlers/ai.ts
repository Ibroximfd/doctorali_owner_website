import type { MockContext } from "../engine";
import { mockResponse, type MockHandler } from "../types";
import { answerFor } from "./ai-answers";

/**
 * Owner AI (backend v2 §8): `status/`, `analysis/` (deterministik topilmalar + Claude xulosasi),
 * `chat/` (savol → bitta javob, `tools_used`, `period`). Topilma maydonlari hujjatda ochiq
 * («deterministik topilma maydonlari») — namunada `code, title, detail, recommendation, area`
 * (savol B-9). `severity`: `urgent | attention | good`, shu tartibda.
 */

const HOUR = 3_600_000;
const iso = (ctx: MockContext, hoursAgo: number) =>
  new Date(ctx.now.getTime() - hoursAgo * HOUR).toISOString();

const SEEDS = [
  {
    id: 88,
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

const findingDto = (seed: (typeof SEEDS)[number]) => ({
  severity: SEVERITY[seed.severity] ?? "attention",
  code: `${seed.domain}.${seed.category}`,
  area: seed.domain,
  title: seed.title,
  detail: seed.summary,
  recommendation: seed.recommendation,
});

const GOOD = [
  {
    severity: "good",
    code: "finance.handover_on_time",
    area: "finance",
    title: "Q va T1 bosh kuryerlardan pulni har kuni oladi",
    detail: "Oxirgi 7 kunda Q va T1 topshiriqlarining hammasi o'z vaqtida.",
    recommendation: "",
  },
];

const analysis = (ctx: MockContext) => {
  const findings = [...SEEDS.filter((seed) => seed.domain !== "warehouse").map(findingDto), ...GOOD].sort(
    (a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity),
  );
  return {
    generated_at: iso(ctx, 0.2),
    period: { date_from: "2026-10-01", date_to: "2026-10-31" },
    findings,
    ai_summary:
      "1. Pul va sotuv joyida, lekin T2 orqada.\n2. Janub bosh kuryeri T2 pulini 3 kunda bir topshirmoqda.\n3. T2 konversiyasi boshqalardan 6 f.p. past.\n4. Janub skladida Kardiomed 3 kunga yetadi.\n5. Prostavit hech bir filialga berilmagan.",
    model: "claude-opus-5",
    warehouse_findings: SEEDS.filter((seed) => seed.domain === "warehouse").map(findingDto),
  };
};

const QUESTION_MIN = 3;
const QUESTION_MAX = 1000;

const chat = (ctx: MockContext) => {
  const body = ctx.body as { question?: unknown } | undefined;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (question.length < QUESTION_MIN || question.length > QUESTION_MAX)
    return mockResponse(400, {
      code: "validation_error",
      detail: "question 3–1000 belgi oralig'ida bo'lsin",
    });
  return { ...answerFor(question, ctx), model: "claude-opus-5" };
};

export const aiHandlers: MockHandler[] = [
  {
    method: "GET",
    path: "ai/status/",
    resolve: (ctx) => ({ enabled: true, model: "claude-opus-5", cached_analysis_at: iso(ctx, 0.2) }),
  },
  { method: "GET", path: "ai/analysis/", resolve: analysis },
  { method: "POST", path: "ai/chat/", resolve: chat },
];
