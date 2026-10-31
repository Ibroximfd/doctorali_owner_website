import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/config/env.server", () => ({
  serverEnv: {
    backendOrigin: "https://backend.test",
    backendServer: "custom",
    isProduction: false,
  },
}));

const { clientInfoOf, refreshAccess, relay } = await import("./backend.server");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("refreshAccess", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("asks the backend once when many blocks refresh with the same token at the same time", async () => {
    fetchMock.mockResolvedValue(json({ access: "new-access", refresh: "new-refresh" }));

    const results = await Promise.all([
      refreshAccess("token-a"),
      refreshAccess("token-a"),
      refreshAccess("token-a"),
    ]);

    expect(fetchMock).toHaveBeenCalledOnce();
    for (const result of results)
      expect(result).toEqual({ kind: "renewed", tokens: { access: "new-access", refresh: "new-refresh" } });
  });

  it("tells an expired session apart from a backend that is briefly down", async () => {
    fetchMock.mockResolvedValueOnce(json({ code: "token_not_valid" }, 401));
    expect(await refreshAccess("token-expired")).toEqual({ kind: "expired" });

    fetchMock.mockResolvedValueOnce(json({ code: "server_error" }, 503));
    expect(await refreshAccess("token-busy")).toEqual({ kind: "unavailable" });

    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(await refreshAccess("token-offline")).toEqual({ kind: "unavailable" });
  });
});

describe("relay", () => {
  it("passes JSON through and never serves a backend HTML page from the panel", async () => {
    const passed = await relay(json({ ok: true }, 201));
    expect(passed.status).toBe(201);
    expect(await passed.json()).toEqual({ ok: true });

    const html = await relay(
      new Response("<html>Server Error</html>", { status: 500, headers: { "content-type": "text/html" } }),
    );
    expect(html.status).toBe(500);
    expect(html.headers.get("content-type")).toContain("application/json");
    expect(await html.json()).toMatchObject({ code: "backend_error" });
  });
});

describe("clientInfoOf", () => {
  it("trusts only the address the reverse proxy wrote", () => {
    const request = new Request("https://panel.test/api/auth/login", {
      headers: { "x-real-ip": "203.0.113.7", "x-forwarded-for": "6.6.6.6", "user-agent": "Safari" },
    });

    expect(clientInfoOf(request)).toEqual({ ip: "203.0.113.7", userAgent: "Safari" });
    expect(clientInfoOf(new Request("https://panel.test/"))).toEqual({ ip: null, userAgent: null });
  });
});
