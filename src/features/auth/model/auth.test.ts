import { describe, expect, it } from "vitest";

import { codeInputSchema, loginInputSchema, safeNextPath } from "./auth.schema";

describe("safeNextPath", () => {
  it("allows a path on this site, with its query", () => {
    expect(safeNextPath("/orders?period=7d")).toBe("/orders?period=7d");
  });

  it("refuses anything that could leave the site", () => {
    expect(safeNextPath("https://evil.example/")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });

  it("refuses hidden characters the URL parser would strip into a foreign address", () => {
    expect(safeNextPath("/\t/evil.example")).toBe("/");
    expect(safeNextPath("/\n/evil.example")).toBe("/");
    expect(safeNextPath("/%09/evil.example")).toBe("/%09/evil.example");
    expect(safeNextPath("/alerts#top")).toBe("/alerts#top");
  });
});

describe("login input", () => {
  it("sends the login as typed, without surrounding spaces", () => {
    expect(loginInputSchema.parse({ username: "  devtest ", password: "x" }).username).toBe("devtest");
  });

  it("requires a login and a password", () => {
    expect(loginInputSchema.safeParse({ username: "  ", password: "x" }).error?.issues[0]?.message).toBe(
      "usernameRequired",
    );
    expect(loginInputSchema.safeParse({ username: "devtest", password: "" }).success).toBe(false);
  });
});

describe("code input", () => {
  it("accepts exactly six digits", () => {
    expect(codeInputSchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(codeInputSchema.safeParse({ code: "12345" }).success).toBe(false);
    expect(codeInputSchema.safeParse({ code: "12345a" }).success).toBe(false);
  });
});
