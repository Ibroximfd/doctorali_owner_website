import { buildContext } from "./engine";
import { alertsHandlers } from "./handlers/alerts";
import { clinicHandlers } from "./handlers/clinic";
import { customersHandlers } from "./handlers/customers";
import { doctorsHandlers } from "./handlers/doctors";
import { financeHandlers } from "./handlers/finance";
import { logisticsHandlers } from "./handlers/logistics";
import { metaHandlers } from "./handlers/meta";
import { mobileAppHandlers } from "./handlers/mobile-app";
import { ordersHandlers } from "./handlers/orders";
import { overviewHandlers } from "./handlers/overview";
import { productsHandlers } from "./handlers/products";
import { reportsHandlers } from "./handlers/reports";
import { salesHandlers } from "./handlers/sales";
import { settingsHandlers } from "./handlers/settings";
import { telegramHandlers } from "./handlers/telegram";
import { mockError, type MockHandler, type MockResponse } from "./types";

const isMockResponse = (value: unknown): value is MockResponse =>
  typeof value === "object" &&
  value !== null &&
  "status" in value &&
  "json" in value &&
  Object.keys(value).length === 2;

const HANDLERS: readonly MockHandler[] = [
  ...metaHandlers,
  ...overviewHandlers,
  ...ordersHandlers,
  ...financeHandlers,
  ...clinicHandlers,
  ...logisticsHandlers,
  ...salesHandlers,
  ...mobileAppHandlers,
  ...productsHandlers,
  ...customersHandlers,
  ...doctorsHandlers,
  ...alertsHandlers,
  ...reportsHandlers,
  ...settingsHandlers,
  ...telegramHandlers,
];

const segmentsOf = (path: string): string[] => path.split("/").filter((segment) => segment !== "");

/** Yo'lni namunaga solishtiradi; mos kelsa `:param` qiymatlarini qaytaradi. */
const matchPath = (pattern: string, path: string): Record<string, string> | null => {
  const expected = segmentsOf(pattern);
  const actual = segmentsOf(path);
  if (expected.length !== actual.length) return null;

  const params: Record<string, string> = {};
  for (const [index, segment] of expected.entries()) {
    const value = actual[index];
    if (value === undefined) return null;
    if (segment.startsWith(":")) params[segment.slice(1)] = decodeURIComponent(value);
    else if (segment !== value) return null;
  }
  return params;
};

export type MockRequest = {
  method: string;
  path: string;
  searchParams: URLSearchParams;
  body?: unknown;
  now?: Date;
};

const paramCount = (pattern: string): number =>
  segmentsOf(pattern).filter((segment) => segment.startsWith(":")).length;

/**
 * `/api/owner/<path>` so'roviga namuna javob. Bir nechta namuna mos kelsa eng
 * aniq yo'l yutadi (`orders/app-funnels/` → `orders/:id/` dan ustun), ro'yxatdagi
 * tartib ahamiyatsiz. Mos handler bo'lmasa — 404.
 */
export const resolveMock = ({ method, path, searchParams, body, now }: MockRequest): MockResponse => {
  const matches = HANDLERS.flatMap((handler) => {
    if (handler.method !== method.toUpperCase()) return [];
    const params = matchPath(handler.path, path);
    return params === null ? [] : [{ handler, params }];
  }).sort((a, b) => paramCount(a.handler.path) - paramCount(b.handler.path));

  const best = matches[0];
  if (best === undefined) return mockError(404, "not_found", `No mock for ${method} ${path}`);

  const result = best.handler.resolve(buildContext({ searchParams, params: best.params, body, now }));
  return isMockResponse(result) ? result : { status: 200, json: result };
};

/** Ro'yxatdan o'tgan barcha namunalar (shartnoma testlari uchun). */
export const listMockHandlers = (): readonly MockHandler[] => HANDLERS;
