import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

import { resolveMock } from "@/shared/testing/fixtures/registry";

import { TEST_NOW } from "./mock-api";

const readJson = async (request: Request): Promise<unknown> => {
  const text = await request.text();
  if (text === "") return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
};

/** Testlarda `/api/owner/*` — ilovadagi namuna rejimi bilan bir xil javob beradi. */
export const server = setupServer(
  http.all("*/api/owner/*", async ({ request }) => {
    const url = new URL(request.url);
    const path = url.pathname.slice(url.pathname.indexOf("/api/owner/") + "/api/owner/".length);
    const body = request.method === "GET" ? undefined : await readJson(request);
    const response = resolveMock({
      method: request.method,
      path,
      searchParams: url.searchParams,
      body,
      now: TEST_NOW,
    });
    return HttpResponse.json(response.json as Record<string, unknown>, { status: response.status });
  }),
);

/** Ekran testlari boshida chaqiriladi: serverni yoqadi va har testdan keyin tozalaydi. */
export const useMockApi = (): void => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
};

/** Bitta test uchun endpointni xato bilan almashtiradi (xato holatini tekshirish). */
export const failNext = (pathPattern: string, status = 500, code = "server_error"): void => {
  server.use(
    http.get(`*/api/owner/${pathPattern}`, () => HttpResponse.json({ code, detail: code }, { status })),
  );
};
