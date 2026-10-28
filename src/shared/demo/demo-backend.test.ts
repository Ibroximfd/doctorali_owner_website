import { describe, expect, it } from "vitest";

import { DEMO_CREDENTIALS } from "../../../config/servers.mjs";

import { listMockHandlers } from "@/shared/testing/fixtures/registry";

import { demoFetch } from "./demo-backend.server";

/** AI javobi asinxron: birinchi o'qishda "kutilmoqda", keyingisida tayyor. */
const readReply = async (chatId: number) => {
  await send(`/api/owner/ai/chats/${chatId}/`);
  return (await (await send(`/api/owner/ai/chats/${chatId}/`)).json()) as {
    messages: { role: string; text: string; attachments: { id: number }[] }[];
  };
};

const send = (path: string, method = "GET", body?: unknown, search = "") =>
  demoFetch(path, { method, body, search });

const bytesOf = async (response: Response): Promise<Uint8Array> =>
  new Uint8Array(await response.arrayBuffer());
const ascii = (bytes: Uint8Array, length: number): string => String.fromCharCode(...bytes.slice(0, length));

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
        // Kesim turi majburiy bo'lgan yagona endpoint — frontend uni doim yuboradi.
        const search = path === "orders/breakdown/" ? "?period=30d&by=source" : "?period=30d";
        return [path, (await send(`/api/owner/${path}`, "GET", undefined, search)).status];
      }),
    );

    expect(statuses.filter(([, status]) => status !== 200)).toEqual([]);
  });

  it("has a handler for every action the panel can send", async () => {
    const actions: [string, string][] = [
      ["PUT", "targets/"],
      ["DELETE", "sessions/s-2/"],
      ["POST", "iam/accounts/"],
      ["PATCH", "iam/accounts/1/"],
      ["POST", "iam/accounts/1/block/"],
      ["POST", "access/members/"],
      ["PATCH", "access/members/1/"],
      ["POST", "access/members/1/revoke/"],
      ["POST", "alerts/1/ack/"],
      ["PATCH", "alerts/rules/sales.filial_lagging/"],
      ["POST", "ai/findings/88/feedback/"],
      ["POST", "ai/findings/88/escalate/"],
      ["POST", "ai/chats/"],
      ["POST", "ai/actions/301/approve/"],
      ["PUT", "ai/autopilot/"],
      ["POST", "issues/1/notify/"],
      ["POST", "reports/export/"],
      ["PUT", "reports/digest/"],
    ];

    for (const [method, path] of actions) {
      const response = await send(`/api/owner/${path}`, method, {});
      const body: unknown = response.status === 204 ? null : await response.json();
      // "No mock for …" — handler umuman yo'q; boshqa 4xx — tana tekshiruvi (handler bor).
      expect(JSON.stringify(body), `${method} ${path}`).not.toContain("No mock for");
    }
  });

  it("answers an AI question by its topic and attaches a real Excel file", async () => {
    const chat = (await (await send("/api/owner/ai/chats/", "POST", {})).json()) as { id: number };
    await send(`/api/owner/ai/chats/${chat.id}/messages/`, "POST", { text: "Omborda nima tugayapti?" });
    const loaded = await readReply(chat.id);
    const reply = loaded.messages.at(-1);

    expect(reply?.role).toBe("assistant");
    expect(reply?.text).toContain("Rayhon krem");

    const file = await send(`/api/owner/ai/attachments/${reply?.attachments[0]?.id ?? 0}/file/`);
    expect(file.headers.get("content-type")).toContain("spreadsheetml");
    expect(ascii(await bytesOf(file), 2)).toBe("PK");
  });

  it("falls back to the daily report for a question it does not recognise", async () => {
    const chat = (await (await send("/api/owner/ai/chats/", "POST", {})).json()) as { id: number };
    await send(`/api/owner/ai/chats/${chat.id}/messages/`, "POST", { text: "Salom" });
    const loaded = await readReply(chat.id);

    expect(loaded.messages.at(-1)?.text).toContain("312 mln");
  });

  it("serves exported reports as XLSX and PDF", async () => {
    const history = (await (await send("/api/owner/reports/exports/")).json()) as {
      results: { job_id: string; format: string; status: string; url: string | null }[];
    };
    const ready = history.results.filter((job) => job.status === "ready");
    expect(ready.map((job) => job.format).sort()).toEqual(["pdf", "xlsx"]);

    for (const job of ready) {
      const file = await send(job.url ?? "");
      expect(file.status).toBe(200);
      const bytes = await bytesOf(file);
      expect(ascii(bytes, job.format === "pdf" ? 5 : 2)).toBe(job.format === "pdf" ? "%PDF-" : "PK");
      expect(file.headers.get("content-disposition")).toContain(`.${job.format}`);
    }
  });
});
