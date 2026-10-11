import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/shared/config/session";

import { proxy } from "./proxy";

const request = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, "http://localhost:3000"), { headers: cookie ? { cookie } : undefined });

describe("proxy (kirish nazorati)", () => {
  it("sends a visitor without a session to the login page and remembers where they were going", () => {
    const response = proxy(request("/orders?period=7d"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/orders?period=7d");
  });

  it("does not add a return address for the home page", () => {
    const location = new URL(proxy(request("/")).headers.get("location") ?? "");

    expect(location.pathname).toBe("/login");
    expect(location.searchParams.has("next")).toBe(false);
  });

  it("lets a signed-in owner through", () => {
    expect(proxy(request("/finance", `${ACCESS_COOKIE}=token`)).headers.get("location")).toBeNull();
  });

  it("accepts a session that only has a refresh token (the BFF renews it)", () => {
    expect(proxy(request("/finance", `${REFRESH_COOKIE}=token`)).headers.get("location")).toBeNull();
  });

  it("keeps a signed-in owner off the login page", () => {
    const location = new URL(
      proxy(request("/login", `${ACCESS_COOKIE}=token`)).headers.get("location") ?? "",
    );

    expect(location.pathname).toBe("/");
  });

  it("shows the login page to a visitor without a session", () => {
    expect(proxy(request("/login")).headers.get("location")).toBeNull();
  });
});
