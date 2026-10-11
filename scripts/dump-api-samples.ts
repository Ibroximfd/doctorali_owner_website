/**
 * Har `/api/owner/*` endpointi uchun namuna JSON ni `docs/api-samples/` ga yozadi —
 * backend jamoasi "aynan qanday shakl kutilyapti" ni shu fayllardan ko'radi.
 * Manba: `src/shared/mocks` (frontend zod sxemalari shu javoblarni tekshiradi).
 *
 *   npm run samples
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { listMockHandlers, resolveMock } from "../src/shared/mocks/registry";

import { CONTRACT_ENDPOINTS } from "./contract/endpoints";

const OUT_DIR = join(process.cwd(), "docs", "api-samples");
/** Barqaror natija uchun qat'iy "hozir": 2026-10-02 14:05 (Toshkent). */
const NOW = new Date("2026-10-02T09:05:00Z");

/** Yo'ldagi `:param` lar uchun namunada mavjud qiymatlar. */
const PARAM_VALUES: Record<string, string> = {
  "orders/:id/": "9f1c0001-0000-4000-8000-000000184011",
  "sales/operators/:id/": "7",
  "logistics/couriers/:id/": "9",
};

const QUERY_BY_PATH: Record<string, string> = {
  "orders/breakdown/": "period=30d&by=source",
  "app/timeseries/": "period=30d&metric=active_users",
  "targets/": "month=2026-10",
};

const fileNameOf = (method: string, path: string): string =>
  `${method}_${path.replace(/\/$/, "").replaceAll("/", "__").replaceAll(":", "")}.json`;

rmSync(OUT_DIR, { recursive: true, force: true });

/** Eksport holati namunasi uchun avval bitta eksport so'rovi yaratiladi (id shundan olinadi). */
const exportJob = resolveMock({
  method: "POST",
  path: "reports/export/",
  searchParams: new URLSearchParams(),
  body: { report: "daily", format: "xlsx", period: "30d" },
  now: NOW,
}).json as { job_id?: unknown };
if (typeof exportJob.job_id === "string" || typeof exportJob.job_id === "number") {
  PARAM_VALUES["reports/export/:id/"] = String(exportJob.job_id);
}

const index: string[] = [];
const writes: string[] = [];
const skipped: string[] = [];

for (const handler of listMockHandlers()) {
  if (handler.method !== "GET") {
    writes.push(`| \`${handler.method} /api/owner/${handler.path}\` |`);
    continue;
  }

  const concretePath = handler.path.replace(/:\w+/, PARAM_VALUES[handler.path] ?? "1");
  const query = QUERY_BY_PATH[handler.path] ?? "period=30d";
  const response = resolveMock({
    method: "GET",
    path: concretePath,
    searchParams: new URLSearchParams(query),
    now: NOW,
  });
  if (response.status !== 200) {
    skipped.push(`${handler.path} → ${response.status}`);
    continue;
  }

  const name = fileNameOf(handler.method, handler.path);
  const file = join(OUT_DIR, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(response.json, null, 2)}\n`);
  index.push(`| \`GET /api/owner/${handler.path}\` | \`?${query}\` | [${name}](${name}) |`);
}

writeFileSync(
  join(OUT_DIR, "README.md"),
  [
    "# API namunalari (`/api/owner/*`)",
    "",
    "Frontend kutayotgan **aniq JSON shakllari**. Har fayl — bitta `GET` endpointning namuna javobi (raqamlar haqiqiy emas).",
    "Avtomatik yaratilgan: `npm run samples` (manba — `src/shared/mocks`). Qo'lda tahrirlanmaydi.",
    "Frontend har javobni zod sxema bilan tekshiradi: `src/features/<bo'lim>/model/*.schema.ts`.",
    "",
    "| Endpoint | So'rov | Namuna |",
    "|---|---|---|",
    ...index.sort(),
    "",
    "## Yozuvchi endpointlar (boshliqning o'z sozlamalari va amallari)",
    "",
    "So'rov va javob shakllari — `docs/02_BACKEND_TZ.md` va tegishli `*.schema.ts` da.",
    "",
    "| Endpoint |",
    "|---|",
    ...writes.sort(),
    "",
  ].join("\n"),
);

/* ---------- endpoint katalogi (`docs/ENDPOINTS.md`) — shartnoma reyestridan ---------- */
const SCOPE_PARAMS = "`period` `date_from` `date_to` `compare` `filial`";
const queryText = (query: Record<string, string> | undefined): string =>
  Object.entries(query ?? {})
    .map(([key, value]) => `\`${key}=${value}\``)
    .join(" ");

const catalogRows = CONTRACT_ENDPOINTS.map((endpoint) => {
  const variants = (endpoint.variants ?? [])
    .map((variant) => queryText(variant))
    .filter(Boolean)
    .join(" · ");
  const params = [
    endpoint.scoped ? SCOPE_PARAMS : "",
    queryText(endpoint.query),
    variants ? `(${variants})` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const sample = fileNameOf("GET", endpoint.path);
  return `| ${endpoint.section} | \`GET /api/owner/${endpoint.path}\` | ${params || "—"} | ${endpoint.shape === "envelope" ? "konvert" : "oddiy"} | [${sample}](api-samples/${sample}) | ${endpoint.note ?? ""} |`;
});

writeFileSync(
  join(process.cwd(), "docs", "ENDPOINTS.md"),
  [
    "# Endpoint katalogi — frontend chaqiradigan barcha `GET /api/owner/*`",
    "",
    "Avtomatik yaratilgan (`npm run samples`, manba — `scripts/contract/endpoints.ts`). Qo'lda tahrirlanmaydi.",
    "Tekshiruv: `npm run contract:check` — har qator haqiqiy backendda chaqiriladi va sxema bilan solishtiriladi.",
    "",
    `Jami: **${CONTRACT_ENDPOINTS.length}** endpoint. «konvert» — \`{period, compare, filials, generated_at, freshness, data}\`, «oddiy» — konvertsiz JSON.`,
    "",
    "| Bo'lim | Endpoint | Parametrlar | Javob | Namuna | Izoh |",
    "|---|---|---|---|---|---|",
    ...catalogRows,
    "",
  ].join("\n"),
);

console.warn(`${index.length} ta namuna yozildi → docs/api-samples/`);
if (skipped.length > 0) {
  console.error(`O'tkazib yuborildi (200 emas):\n  ${skipped.join("\n  ")}`);
  process.exitCode = 1;
}
