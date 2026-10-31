/**
 * Haqiqiy backend javoblari frontend kutgan shaklga mosmi — har `GET /api/owner/*`
 * endpoint chaqiriladi va ilovadagi zod sxemasi bilan tekshiriladi.
 *
 *   npm run backend:login                       # bir marta: parol + SMS (sessiya lokal faylda)
 *   npm run contract:check                      # saqlangan sessiya bilan
 *   APP_SERVER=test npm run backend:login       # vaqtincha boshqa server (default — `config/servers.mjs`)
 *   OWNER_ACCESS_TOKEN=<owner JWT> npm run contract:check   # saqlangan sessiyasiz, tayyor token bilan
 *   npm run contract:check -- --full            # davr/filial/taqqoslashning 10 ta holatida
 *   npm run contract:check -- --only=sales/     # faqat bitta bo'lim
 *
 * Natija: har endpoint ✓ / ✗ va mos kelmagan maydonlar ro'yxati. Xato bo'lsa chiqish kodi 1.
 * Faqat o'qiydi: hech qanday yozuvchi so'rov yuborilmaydi.
 */
import { resolveBackend } from "../src/shared/config/backend-server";

import { checkAll, type CheckResult, type FetchJson } from "./contract/check";
import { DEFAULT_SCOPE, SCOPE_MATRIX, apiUrlOf } from "./contract/endpoints";
import { readSession, refreshSession, type ContractSession } from "./contract/session";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => args.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];

const REQUEST_TIMEOUT_MS = 30_000;

/** Saqlangan sessiya bilan: 401 kelsa token bir marta yangilanadi va so'rov qaytariladi. */
const backendFetcher = (initial: ContractSession): FetchJson => {
  let session = initial;

  const request = (path: string, query: Record<string, string>) => {
    const url = new URL(apiUrlOf(path), session.origin);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    return fetch(url, {
      headers: { authorization: `Bearer ${session.access}`, accept: "application/json", "x-lang": "uz" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  };

  return async (path, query) => {
    let response = await request(path, query);
    if (response.status === 401 && session.refresh) {
      const renewed = await refreshSession(session);
      if (renewed) {
        session = renewed;
        response = await request(path, query);
      }
    }
    return { status: response.status, json: await response.json().catch(() => null) };
  };
};

const label = (result: CheckResult): string => {
  const query = new URLSearchParams(result.query).toString();
  return `GET ${apiUrlOf(result.path)}${query ? `?${query}` : ""}`;
};

const ICON: Record<CheckResult["outcome"], string> = {
  ok: "✓",
  schema: "✗",
  http: "✗",
  network: "✗",
  skipped: "–",
};

const main = async () => {
  const envToken = process.env.OWNER_ACCESS_TOKEN;
  const session: ContractSession | null = envToken
    ? {
        origin: resolveBackend({ origin: process.env.BACKEND_ORIGIN }).origin,
        access: envToken,
        refresh: "",
        savedAt: "",
      }
    : readSession();
  if (session === null) {
    console.error("Avval kiring: npm run backend:login (yoki OWNER_ACCESS_TOKEN bering).");
    process.exit(2);
  }

  const fetcher = backendFetcher(session);
  const scopes = flag("full") ? SCOPE_MATRIX : [DEFAULT_SCOPE];
  const results = await checkAll(fetcher, scopes, option("only"));

  for (const result of results) {
    const status = result.status && result.status !== 200 ? ` [HTTP ${result.status}]` : "";
    console.log(`${ICON[result.outcome]} ${label(result)}${status}`);
    for (const problem of result.problems) console.log(`    ${problem}`);
  }

  const failed = results.filter((result) => result.outcome !== "ok" && result.outcome !== "skipped");
  const skipped = results.filter((result) => result.outcome === "skipped");
  console.log(
    `\n${results.length - failed.length - skipped.length} ✓ · ${failed.length} ✗ · ${skipped.length} o'tkazib yuborildi`,
  );
  process.exit(failed.length > 0 ? 1 : 0);
};

void main();
