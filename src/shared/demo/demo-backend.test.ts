import { describe, expect, it } from "vitest";

import { DEMO_CREDENTIALS } from "../../../config/servers.mjs";

import { listMockHandlers } from "@/shared/testing/fixtures/registry";

import { demoFetch } from "./demo-backend.server";

const send = (path: string, method = "GET", body?: unknown, search = "") =>
  demoFetch(path, { method, body, search });

describe("demo backend", () => {
  it("opens only with the demo login and password", async () => {
    const wrong = await send("/api/owner/login/", "POST", { username: "demo", password: "xato" });
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toMatchObject({ code: "invalid_credentials" });

    const right = await send("/api/owner/login/", "POST", DEMO_CREDENTIALS);
    expect(right.status).toBe(200);
    expect(await right.json()).toMatchObject({ access: expect.any(String), user: { role: "owner" } });
  });

  it("keeps the session alive and has no live channel", async () => {
    expect((await send("/api/user/refresh/", "POST", { refresh: "demo-refresh" })).status).toBe(200);
    expect((await send("/api/owner/ws-ticket/", "POST")).status).toBe(404);
  });

  it("answers every screen endpoint without a path parameter", async () => {
    const paths = listMockHandlers()
      .filter((handler) => handler.method === "GET" && !handler.path.includes(":"))
      .map((handler) => handler.path);

    const statuses = await Promise.all(
      paths.map(async (path) => {
        return [path, (await send(`/api/owner/${path}`, "GET", undefined, "?period=30d")).status];
      }),
    );

    expect(statuses.filter(([, status]) => status !== 200)).toEqual([]);
  });

  it("has a handler for every action the panel can send", async () => {
    const actions: [string, string][] = [
      ["DELETE", "sessions/s-2/"],
      ["POST", "structure/filials/"],
      ["PATCH", "structure/filials/1/"],
      ["POST", "structure/filials/1/set-main/"],
      ["POST", "structure/filials/1/heads/"],
      ["DELETE", "structure/filials/1/heads/chief_logist/"],
      ["PATCH", "structure/roles/91/"],
      ["PUT", "structure/sklad-grants/1/"],
      ["POST", "ai/chat/"],
    ];

    for (const [method, path] of actions) {
      const response = await send(`/api/owner/${path}`, method, {});
      const body: unknown = response.status === 204 ? null : await response.json();
      // "No mock for …" — handler umuman yo'q; boshqa 4xx — tana tekshiruvi (handler bor).
      expect(JSON.stringify(body), `${method} ${path}`).not.toContain("No mock for");
    }
  });

  it("answers an AI question from the data, with its sources", async () => {
    const response = await send("/api/owner/ai/chat/", "POST", { question: "Skladda nima tugayapti?" });
    const answer = (await response.json()) as { answer: string; tools_used: string[] };

    expect(answer.answer).toContain("Janub sklad: Kardiomed");
    expect(answer.tools_used).toContain("sklad_stock");
  });

  it("serves the sklad API under /api/sklad/ like the logist site", async () => {
    const sklads = (await (await send("/api/sklad/sklads/")).json()) as { name: string }[];
    expect(sklads).toHaveLength(5);
    expect((await send("/api/sklad/ledger/", "GET", undefined, "?page=1")).status).toBe(200);
  });
});
