// @vitest-environment jsdom
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { installTelegram, uninstallTelegram } from "@/shared/testing/telegram";

import { TelegramRuntime } from "./telegram-runtime";

const navigation = vi.hoisted(() => ({ pathname: "/orders", back: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ back: navigation.back, push: vi.fn() }),
}));

const setChannel = (on: boolean) => {
  document.cookie = on ? "da_owner_channel=tg; path=/" : "da_owner_channel=; max-age=0; path=/";
};

describe("TelegramRuntime", () => {
  let telegram: ReturnType<typeof installTelegram>;
  let now = 1_000_000;

  beforeEach(() => {
    telegram = installTelegram({ initData: "user=x" });
    vi.spyOn(Date, "now").mockImplementation(() => now);
    navigation.back.mockReset();
  });
  afterEach(() => {
    setChannel(false);
    uninstallTelegram();
    vi.restoreAllMocks();
  });

  it("does nothing on the regular website", async () => {
    const onLock = vi.fn();
    await renderWithProviders(<TelegramRuntime onLock={onLock} />);

    await act(async () => {});
    expect(telegram.webApp.ready).not.toHaveBeenCalled();
  });

  it("takes over Telegram's chrome inside a Telegram session", async () => {
    setChannel(true);
    await renderWithProviders(<TelegramRuntime onLock={vi.fn()} />);

    await vi.waitFor(() => expect(telegram.webApp.ready).toHaveBeenCalled());
    expect(telegram.webApp.expand).toHaveBeenCalled();
    expect(telegram.webApp.disableVerticalSwipes).toHaveBeenCalled();
    expect(telegram.webApp.BackButton.show).toHaveBeenCalled();

    const [goBack] = vi.mocked(telegram.webApp.BackButton.onClick).mock.calls.at(-1) ?? [];
    goBack?.();
    expect(navigation.back).toHaveBeenCalled();
  });

  it("locks when the mini app comes back after more than a minute away", async () => {
    setChannel(true);
    const onLock = vi.fn();
    await renderWithProviders(<TelegramRuntime onLock={onLock} />);
    await vi.waitFor(() =>
      expect(telegram.webApp.onEvent).toHaveBeenCalledWith("activated", expect.any(Function)),
    );

    telegram.emit("deactivated");
    now += 10_000;
    telegram.emit("activated");
    expect(onLock).not.toHaveBeenCalled();

    telegram.emit("deactivated");
    now += 61_000;
    telegram.emit("activated");
    expect(onLock).toHaveBeenCalledOnce();
  });
});
