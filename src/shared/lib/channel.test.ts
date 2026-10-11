// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { isTelegramChannel, signInHref, telegramEntryHref } from "./channel";

const setChannel = (value: string | null) => {
  document.cookie =
    value === null ? "da_owner_channel=; max-age=0; path=/" : `da_owner_channel=${value}; path=/`;
};

describe("session channel", () => {
  afterEach(() => setChannel(null));

  it("sends an expired web session back to the login page with the way back", () => {
    expect(isTelegramChannel()).toBe(false);
    expect(signInHref("/finance?period=7d")).toBe("/login?next=%2Ffinance%3Fperiod%3D7d");
  });

  it("sends a Telegram session to the PIN screen instead", () => {
    setChannel("tg");
    expect(isTelegramChannel()).toBe(true);
    expect(signInHref("/alerts")).toBe("/tg?next=%2Falerts");
  });

  it("drops the way back when it is the home page", () => {
    expect(telegramEntryHref("/")).toBe("/tg");
    expect(telegramEntryHref()).toBe("/tg");
  });
});
