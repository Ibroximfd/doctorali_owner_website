/**
 * `docs/ENDPOINTS.md` — panel chaqiradigan barcha `GET /api/owner/*` katalogi.
 * Manba: shartnoma reyestri (`scripts/contract/endpoints.ts`); namuna ma'lumot ishlatilmaydi.
 *
 *   npm run endpoints:doc
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { CONTRACT_ENDPOINTS, apiUrlOf } from "./contract/endpoints";

const fileNameOf = (method: string, path: string): string =>
  `${method}_${path.replace(/\/$/, "").replaceAll("/", "__").replaceAll(":", "")}.json`;

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
    "Avtomatik yaratilgan (`npm run endpoints:doc`, manba — `scripts/contract/endpoints.ts`). Qo'lda tahrirlanmaydi.",
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

console.warn(`${CONTRACT_ENDPOINTS.length} ta endpoint → docs/ENDPOINTS.md`);
