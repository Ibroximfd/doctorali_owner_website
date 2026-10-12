// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetTelegramMock } from "@/shared/testing/fixtures/handlers/telegram";
import { mockSend } from "@/shared/testing/mock-api";
import { renderWithProviders } from "@/shared/testing/render";
import { server, useMockApi } from "@/shared/testing/server";
import {
  installTelegram,
  sampleInitData,
  telegramAuthHandler,
  uninstallTelegram,
} from "@/shared/testing/telegram";

import { TelegramEntry } from "./telegram-entry";

const initData = sampleInitData(901);
const assign = vi.fn();

/** Parol + SMS formasi o'rnida — u `auth` featureda alohida sinalgan. */
const renderSignIn = (onSignedIn: () => void) => (
  <button type="button" onClick={onSignedIn}>
    Parol va SMS bilan tasdiqlandi
  </button>
);

const renderEntry = (next?: string) =>
  renderWithProviders(<TelegramEntry next={next} renderSignIn={renderSignIn} />);

const linkSample = (pin = "4071") => mockSend("POST", "telegram/link/", { init_data: initData, pin });

describe("TelegramEntry", () => {
  useMockApi();
  let telegram: ReturnType<typeof installTelegram>;

  beforeEach(() => {
    server.use(telegramAuthHandler);
    telegram = installTelegram({ initData });
    vi.stubGlobal("location", { ...window.location, origin: "http://localhost:3000", assign });
  });
  afterEach(() => {
    uninstallTelegram();
    resetTelegramMock();
    vi.unstubAllGlobals();
    assign.mockReset();
  });

  it("links the account once: password and SMS, then a strong PIN typed twice", async () => {
    await renderEntry("/alerts");

    expect(await screen.findByRole("heading", { name: "Telegram akkauntni bog'lash" })).toBeInTheDocument();
    expect(telegram.webApp.ready).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Parol va SMS bilan tasdiqlandi" }));

    expect(await screen.findByRole("heading", { name: "Yangi PIN" })).toBeInTheDocument();
    await userEvent.keyboard("1234");
    expect(await screen.findByRole("alert")).toHaveTextContent("Bu PIN juda oddiy — boshqasini tanlang");

    await userEvent.keyboard("4071");
    expect(await screen.findByRole("heading", { name: "PIN ni takrorlang" })).toBeInTheDocument();
    await userEvent.keyboard("4072");
    expect(await screen.findByRole("alert")).toHaveTextContent("PIN lar mos kelmadi — qaytadan o'rnating");

    await userEvent.keyboard("4071");
    await screen.findByRole("heading", { name: "PIN ni takrorlang" });
    await userEvent.keyboard("4071");

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/alerts"));
    expect(telegram.webApp.HapticFeedback.notificationOccurred).toHaveBeenLastCalledWith("success");
  });

  it("asks only for the PIN once linked, and counts wrong attempts", async () => {
    linkSample();
    await renderEntry();

    expect(await screen.findByRole("heading", { name: "Salom, Boshliq" })).toBeInTheDocument();
    await userEvent.keyboard("1111");

    expect(await screen.findByRole("alert")).toHaveTextContent("PIN noto'g'ri");
    expect(await screen.findByText("Qolgan urinishlar: 4")).toBeInTheDocument();
    expect(telegram.webApp.HapticFeedback.notificationOccurred).toHaveBeenLastCalledWith("error");

    await userEvent.keyboard("4071");
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
  });

  it("locks after the fifth wrong PIN and shows when it opens again", async () => {
    linkSample();
    await renderEntry();
    await screen.findByRole("heading", { name: "Salom, Boshliq" });

    for (const left of [4, 3, 2, 1]) {
      await userEvent.keyboard("1111");
      await screen.findByText(`Qolgan urinishlar: ${left}`);
    }
    await userEvent.keyboard("1111");

    expect(await screen.findByRole("heading", { name: "PIN vaqtincha qulflangan" })).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent(/^1[45]:\d\d$/);
    expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();
  });

  it("recovers a forgotten PIN through the password, and can step back", async () => {
    linkSample();
    await renderEntry();
    await screen.findByRole("heading", { name: "Salom, Boshliq" });

    await userEvent.click(screen.getByRole("button", { name: "PIN ni unutdim" }));
    expect(screen.getByRole("heading", { name: "PIN ni tiklash" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Bekor qilish" }));
    expect(screen.getByRole("heading", { name: "Salom, Boshliq" })).toBeInTheDocument();
  });

  it("stops when the Telegram account belongs to someone else", async () => {
    server.use(
      http.post("*/api/auth/telegram/link", () =>
        HttpResponse.json({ code: "telegram_already_linked" }, { status: 409 }),
      ),
    );
    await renderEntry();
    await userEvent.click(await screen.findByRole("button", { name: "Parol va SMS bilan tasdiqlandi" }));
    await screen.findByRole("heading", { name: "Yangi PIN" });
    await userEvent.keyboard("4071");
    await screen.findByRole("heading", { name: "PIN ni takrorlang" });
    await userEvent.keyboard("4071");

    expect(await screen.findByRole("heading", { name: "Bu Telegram akkaunt band" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Yopish" }));
    expect(telegram.webApp.close).toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("offers a retry when the server does not answer", async () => {
    server.use(
      http.post("*/api/auth/telegram/status", () =>
        HttpResponse.json({ code: "server_error" }, { status: 500 }),
      ),
    );
    await renderEntry();

    expect(await screen.findByRole("button", { name: "Qayta urinish" })).toBeInTheDocument();
  });

  it("explains itself when opened outside Telegram", async () => {
    installTelegram({ initData: "" });
    await renderEntry();

    expect(
      await screen.findByRole("heading", { name: "Bu sahifa Telegram ichida ochiladi" }),
    ).toBeInTheDocument();
    const block = screen.getByRole("heading", { name: "Bu sahifa Telegram ichida ochiladi" }).parentElement;
    expect(within(block as HTMLElement).getByRole("link", { name: "Saytdan kirish" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
