/**
 * Shartnoma tekshiruvi yadrosi: har endpointni chaqiradi va javobni ilovadagi zod
 * sxemasi bilan solishtiradi. Transport tashqaridan beriladi — haqiqiy backend
 * (`check-backend-contract.ts`) yoki namuna (`check.test.ts`).
 */
import type { ZodIssue } from "zod";

import { envelopeSchema } from "@/shared/lib/envelope";

import { CONTRACT_ENDPOINTS, DEFAULT_SCOPE, type ContractEndpoint, type Query } from "./endpoints";

export type Fetched = { status: number; json: unknown };
export type FetchJson = (path: string, query: Query) => Promise<Fetched>;

export type CheckResult = {
  path: string;
  query: Query;
  outcome: "ok" | "http" | "schema" | "skipped" | "network";
  status?: number;
  /** Mos kelmagan maydonlar: `data.results.0.amount — Expected number, received string`. */
  problems: string[];
};

const MAX_PROBLEMS = 8;

const describeIssue = (issue: ZodIssue): string =>
  `${issue.path.length > 0 ? issue.path.join(".") : "(ildiz)"} — ${issue.message}`;

const queriesOf = (endpoint: ContractEndpoint, scopes: readonly Query[]): Query[] => {
  const base = endpoint.scoped ? scopes : [{}];
  const variants = endpoint.variants ?? [{}];
  return base.flatMap((scope) => variants.map((variant) => ({ ...scope, ...endpoint.query, ...variant })));
};

const resolvePaths = async (endpoint: ContractEndpoint, fetchJson: FetchJson): Promise<string[]> => {
  if (!endpoint.idSource) return [endpoint.path];
  const source = await fetchJson(endpoint.idSource.path, endpoint.idSource.query);
  const ids = source.status === 200 ? endpoint.idSource.pick(source.json) : [];
  return ids.map((id) => endpoint.path.replace(/:\w+/, encodeURIComponent(id)));
};

export const checkEndpoint = async (
  endpoint: ContractEndpoint,
  fetchJson: FetchJson,
  scopes: readonly Query[] = [DEFAULT_SCOPE],
): Promise<CheckResult[]> => {
  let paths: string[];
  try {
    paths = await resolvePaths(endpoint, fetchJson);
  } catch (error) {
    return [{ path: endpoint.path, query: {}, outcome: "network", problems: [String(error)] }];
  }
  if (paths.length === 0)
    return [
      {
        path: endpoint.path,
        query: {},
        outcome: "skipped",
        problems: [`id olinmadi: ${endpoint.idSource?.path} bo'sh yoki xato`],
      },
    ];

  const schema = endpoint.shape === "envelope" ? envelopeSchema(endpoint.schema) : endpoint.schema;
  const results: CheckResult[] = [];

  for (const path of paths)
    for (const query of queriesOf(endpoint, scopes)) {
      let fetched: Fetched;
      try {
        fetched = await fetchJson(path, query);
      } catch (error) {
        results.push({ path, query, outcome: "network", problems: [String(error)] });
        continue;
      }
      // Karta boshqa filialniki bo'lsa filial filtri bilan 404 — kutilgan javob, xato emas.
      if (fetched.status === 404 && endpoint.idSource && query.filial) {
        results.push({
          path,
          query,
          outcome: "skipped",
          status: 404,
          problems: ["boshqa filial yozuvi — 404 kutilgan"],
        });
        continue;
      }
      if (fetched.status !== 200) {
        results.push({
          path,
          query,
          outcome: "http",
          status: fetched.status,
          problems: [JSON.stringify(fetched.json)],
        });
        continue;
      }
      const parsed = schema.safeParse(fetched.json);
      results.push(
        parsed.success
          ? { path, query, outcome: "ok", status: 200, problems: [] }
          : {
              path,
              query,
              outcome: "schema",
              status: 200,
              problems: parsed.error.issues.slice(0, MAX_PROBLEMS).map(describeIssue),
            },
      );
    }
  return results;
};

export const checkAll = async (
  fetchJson: FetchJson,
  scopes: readonly Query[] = [DEFAULT_SCOPE],
  only?: string,
): Promise<CheckResult[]> => {
  const endpoints = CONTRACT_ENDPOINTS.filter((endpoint) => !only || endpoint.path.startsWith(only));
  const results: CheckResult[] = [];
  for (const endpoint of endpoints) results.push(...(await checkEndpoint(endpoint, fetchJson, scopes)));
  return results;
};
