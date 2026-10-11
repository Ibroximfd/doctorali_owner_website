import { describe, expect, it } from "vitest";

import { parseInitData } from "./telegram-init-data";
import {
  INIT_DATA_MAX_AGE_SECONDS,
  checkInitData,
  dataCheckString,
  signDataCheckString,
} from "./telegram-init-data.server";

const BOT_TOKEN = "123456:TEST-token-for-unit-tests";
const NOW = new Date("2026-10-05T09:00:00Z");
const nowSeconds = NOW.getTime() / 1000;

/** Telegram qanday imzolasa, xuddi shunday imzolangan initData. */
const signed = (fields: Record<string, string>, token = BOT_TOKEN): string => {
  const params = new URLSearchParams(fields);
  params.set("hash", signDataCheckString(dataCheckString(params), token));
  return params.toString();
};

const fields = (authDate = nowSeconds - 60) => ({
  query_id: "AAH-sample",
  user: JSON.stringify({ id: 777, first_name: "Ali", language_code: "uz" }),
  auth_date: String(authDate),
});

describe("parseInitData", () => {
  it("reads the user, the time and the signature", () => {
    expect(parseInitData(signed(fields()))).toMatchObject({
      user: { id: 777, firstName: "Ali", languageCode: "uz", username: null },
      authDate: nowSeconds - 60,
    });
  });

  it("refuses broken input instead of guessing", () => {
    expect(parseInitData("")).toBeNull();
    expect(parseInitData("user=%7Bbroken&auth_date=1&hash=aa")).toBeNull();
    expect(parseInitData(new URLSearchParams({ ...fields(), hash: "" }).toString())).toBeNull();
    expect(parseInitData(`hash=aa&auth_date=1&user=${"x".repeat(5000)}`)).toBeNull();
  });
});

describe("checkInitData", () => {
  it("accepts data signed with the bot token", () => {
    expect(checkInitData(signed(fields()), BOT_TOKEN, NOW)).toBe("ok");
  });

  it("does not depend on the order of the fields", () => {
    const params = new URLSearchParams(signed(fields()));
    const reversed = new URLSearchParams([...params.entries()].reverse());
    expect(checkInitData(reversed.toString(), BOT_TOKEN, NOW)).toBe("ok");
  });

  it("rejects a changed field, another bot's signature and a malformed hash", () => {
    const tampered = signed(fields()).replace("777", "778");
    expect(checkInitData(tampered, BOT_TOKEN, NOW)).toBe("invalid");
    expect(checkInitData(signed(fields(), "999:OTHER"), BOT_TOKEN, NOW)).toBe("invalid");
    expect(checkInitData(new URLSearchParams({ ...fields(), hash: "abc" }).toString(), BOT_TOKEN, NOW)).toBe(
      "invalid",
    );
  });

  it("rejects data older than a day", () => {
    const old = signed(fields(nowSeconds - INIT_DATA_MAX_AGE_SECONDS - 1));
    expect(checkInitData(old, BOT_TOKEN, NOW)).toBe("expired");
  });
});
