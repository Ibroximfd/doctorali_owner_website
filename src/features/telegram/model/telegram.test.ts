import { afterEach, describe, expect, it } from "vitest";

import { AppError } from "@/shared/lib/app-error";
import { parseJson } from "@/shared/lib/envelope";
import { resetTelegramMock } from "@/shared/testing/fixtures/handlers/telegram";
import { mockSend } from "@/shared/testing/mock-api";
import { sampleInitData } from "@/shared/testing/telegram";

import { linkFailureOf, lockRemaining, pinFailureOf } from "./telegram.rules";
import { telegramSignInSchema, telegramStatusSchema } from "./telegram.schema";

const initData = sampleInitData(42);
const status = () =>
  parseJson(telegramStatusSchema, mockSend("POST", "telegram/status/", { init_data: initData }).json);
const login = (pin: string) => mockSend("POST", "telegram/login/", { init_data: initData, pin });

describe("telegram sample backend", () => {
  afterEach(resetTelegramMock);

  it("starts unlinked and rejects data it cannot read", () => {
    expect(status()).toEqual({ state: "unlinked", fullName: null, attemptsLeft: null, lockedUntil: null });
    expect(mockSend("POST", "telegram/status/", { init_data: "garbage" })).toMatchObject({
      status: 400,
      json: { code: "init_data_invalid" },
    });
    expect(login("4071")).toMatchObject({ status: 404, json: { code: "telegram_not_linked" } });
  });

  it("links with a strong PIN only, then signs in with it", () => {
    expect(mockSend("POST", "telegram/link/", { init_data: initData, pin: "1234" })).toMatchObject({
      status: 400,
      json: { code: "pin_weak" },
    });
    expect(mockSend("POST", "telegram/link/", { init_data: initData, pin: "4071" }).status).toBe(200);

    expect(status()).toMatchObject({ state: "pin_required", fullName: "Boshliq", attemptsLeft: 5 });
    const ok = login("4071");
    expect(ok.status).toBe(200);
    expect(() => parseJson(telegramSignInSchema, ok.json)).not.toThrow();
  });

  it("counts wrong PINs down and locks on the fifth", () => {
    mockSend("POST", "telegram/link/", { init_data: initData, pin: "4071" });

    for (const left of [4, 3, 2, 1])
      expect(login("0001")).toMatchObject({
        status: 401,
        json: { code: "pin_invalid", attempts_left: left },
      });
    expect(login("0001")).toMatchObject({ status: 423, json: { code: "pin_locked" } });
    // qulf paytida to'g'ri PIN ham o'tmaydi
    expect(login("4071").status).toBe(423);
    expect(status()).toMatchObject({ state: "locked", attemptsLeft: 0 });
  });
});

describe("telegram rules", () => {
  it("maps PIN errors to what the screen does", () => {
    expect(pinFailureOf(new AppError("unauthorized", undefined, "pin_invalid"))).toBe("invalid");
    expect(pinFailureOf(new AppError("unknown", undefined, "pin_locked"))).toBe("locked");
    expect(pinFailureOf(new AppError("not-found", undefined, "telegram_not_linked"))).toBe("unlinked");
    expect(pinFailureOf(new AppError("validation", undefined, "init_data_expired"))).toBe("initData");
    expect(pinFailureOf(new AppError("offline"))).toBe("offline");
    expect(pinFailureOf(new AppError("server"))).toBe("server");
  });

  it("maps linking errors to the step to return to", () => {
    expect(linkFailureOf(new AppError("validation", undefined, "pin_weak"))).toBe("weak");
    expect(linkFailureOf(new AppError("unknown", undefined, "telegram_already_linked"))).toBe(
      "alreadyLinked",
    );
    expect(linkFailureOf(new AppError("unauthorized"))).toBe("reauth");
    expect(linkFailureOf(new AppError("forbidden", undefined, "reauth_required"))).toBe("reauth");
    expect(linkFailureOf(new AppError("server"))).toBe("server");
  });

  it("counts down to the end of the lock and stops there", () => {
    const now = Date.parse("2026-10-05T09:00:00Z");
    expect(lockRemaining("2026-10-05T09:14:05Z", now)).toEqual({ minutes: 14, seconds: 5 });
    expect(lockRemaining("2026-10-05T09:00:00Z", now)).toBeNull();
    expect(lockRemaining("not a date", now)).toBeNull();
  });
});
