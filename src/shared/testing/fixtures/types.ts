import type { MockContext } from "./engine";

export type MockMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Aniq status bilan javob (xato yoki 201/204) — aks holda natija 200 JSON bo'ladi. */
export type MockResponse = { status: number; json: unknown };

export type MockHandler = {
  method: MockMethod;
  /** `/api/owner/` ga nisbatan yo'l; o'zgaruvchi bo'lak `:nom` (`orders/:id/`). */
  path: string;
  resolve: (ctx: MockContext) => unknown;
};

export const mockResponse = (status: number, json: unknown): MockResponse => ({ status, json });

export const mockError = (status: number, code: string, detail?: string): MockResponse =>
  mockResponse(status, { code, detail: detail ?? code });
