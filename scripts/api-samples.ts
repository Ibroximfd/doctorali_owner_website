/**
 * `docs/api-samples/` — har endpoint uchun javob namunasi (backend uchun).
 * Manba: testlardagi namuna backend (`src/shared/testing/fixtures`); mavjud fayllar
 * qayta yozilmaydi, faqat yetishmaganlari qo'shiladi.
 *
 *   npm run api:samples
 */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { resolveMock } from "@/shared/testing/fixtures/registry";

import { CONTRACT_ENDPOINTS, DEFAULT_SCOPE } from "./contract/endpoints";

const fileNameOf = (path: string): string =>
  `GET_${path.replace(/\/$/, "").replaceAll("/", "__").replaceAll(":", "")}.json`;

const now = new Date("2026-10-05T09:00:00Z");
const fetchMock = (path: string, query: Record<string, string>) =>
  resolveMock({ method: "GET", path, searchParams: new URLSearchParams(query), now });

let written = 0;
for (const endpoint of CONTRACT_ENDPOINTS) {
  const target = join(process.cwd(), "docs", "api-samples", fileNameOf(endpoint.path));
  if (existsSync(target)) continue;

  let path = endpoint.path;
  if (endpoint.idSource) {
    const source = await fetchMock(endpoint.idSource.path, endpoint.idSource.query ?? {});
    const [id] = endpoint.idSource.pick(source.json);
    if (id === undefined) continue;
    path = path.replace(/:\w+/, encodeURIComponent(id));
  }
  const query = { ...(endpoint.scoped ? DEFAULT_SCOPE : {}), ...endpoint.query };
  const response = await fetchMock(path, query);
  if (response.status !== 200) continue;
  writeFileSync(target, `${JSON.stringify(response.json, null, 2)}\n`);
  written += 1;
}

console.warn(`${written} ta yangi namuna → docs/api-samples/`);
