// @vitest-environment jsdom
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server, useMockApi } from "@/shared/testing/server";

import { isMissingEndpoint, type AppError } from "./app-error";
import { apiGet } from "./http";

const catchError = async (promise: Promise<unknown>): Promise<AppError> => {
  try {
    await promise;
  } catch (error) {
    return error as AppError;
  }
  throw new Error("xato kutilgan edi");
};

describe("apiGet", () => {
  useMockApi();

  it("remembers an endpoint the backend does not have and stops calling it", async () => {
    let calls = 0;
    server.use(
      http.get("*/api/owner/new-section/", () => {
        calls += 1;
        return HttpResponse.json({ code: "backend_error", detail: "backend_error" }, { status: 404 });
      }),
    );

    const first = await catchError(apiGet("new-section/"));
    const second = await catchError(apiGet("new-section/", { period: "7d" }));

    expect(isMissingEndpoint(first)).toBe(true);
    expect(isMissingEndpoint(second)).toBe(true);
    expect(calls).toBe(1);
  });

  it("keeps asking when the backend itself says a record was not found", async () => {
    let calls = 0;
    server.use(
      http.get("*/api/owner/orders/42/", () => {
        calls += 1;
        return HttpResponse.json({ code: "not_found", detail: "Buyurtma topilmadi" }, { status: 404 });
      }),
    );

    const error = await catchError(apiGet("orders/42/"));
    await catchError(apiGet("orders/42/"));

    expect(error.kind).toBe("not-found");
    expect(isMissingEndpoint(error)).toBe(false);
    expect(calls).toBe(2);
  });

  it("does not retry a failing read by itself — retries belong to the query layer", async () => {
    let calls = 0;
    server.use(
      http.get("*/api/owner/flaky/", () => {
        calls += 1;
        return HttpResponse.json({ code: "server_error" }, { status: 503 });
      }),
    );

    const error = await catchError(apiGet("flaky/"));

    expect(error.kind).toBe("server");
    expect(calls).toBe(1);
  });
});
