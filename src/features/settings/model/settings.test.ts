import { describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { mockGet, mockSend } from "@/shared/testing/mock-api";

import { sessionLabel } from "./settings.rules";
import { sessionsResponseSchema } from "./settings.schema";

const sessions = () => parseJson(sessionsResponseSchema, mockGet("sessions/")).results;

describe("sessions contract", () => {
  it("lists devices with exactly one marked as the current one", () => {
    expect(sessions().filter((session) => session.isCurrent)).toHaveLength(1);
  });

  it("never revokes the current device or an unknown session", () => {
    const current = sessions().find((session) => session.isCurrent);

    expect(mockSend("DELETE", `sessions/${current?.id}/`)).toMatchObject({
      status: 400,
      json: { code: "session_is_current" },
    });
    expect(mockSend("DELETE", "sessions/nope/")).toMatchObject({
      status: 404,
      json: { code: "session_not_found" },
    });
    expect(sessions().some((session) => session.isCurrent)).toBe(true);
  });

  it("a revoked session disappears and cannot be revoked twice", () => {
    const other = sessions().find((session) => !session.isCurrent);
    if (!other) throw new Error("sample has no second session");

    expect(mockSend("DELETE", `sessions/${other.id}/`).status).toBe(200);
    expect(sessions().map((session) => session.id)).not.toContain(other.id);
    expect(mockSend("DELETE", `sessions/${other.id}/`).status).toBe(404);
  });
});

describe("helpers", () => {
  it("names a session by device and browser when the browser is known", () => {
    expect(sessionLabel({ device: "MacBook", browser: "Chrome" })).toBe("MacBook · Chrome");
    expect(sessionLabel({ device: "Android", browser: null })).toBe("Android");
  });
});
