// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { useSessionStore } from "@/shared/stores/session-store";
import { resetChats } from "@/shared/testing/fixtures/handlers/chats";
import { resetStructure } from "@/shared/testing/fixtures/structure-v2";
import { mockSend } from "@/shared/testing/mock-api";
import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { ChatsScreen } from "./chats-screen";

describe("ChatsScreen", () => {
  useMockApi();
  afterEach(() => {
    resetChats();
    resetStructure();
    useSessionStore.setState({ canAct: true });
  });

  it("lists channels by filial with unread counts and opens a conversation", async () => {
    await renderWithProviders(<ChatsScreen />);

    const list = await screen.findByRole("navigation", { name: "Kanallar" });
    expect(within(list).getByRole("heading", { name: "Qo'qon" })).toBeInTheDocument();
    expect(screen.getByText("O'qilmagan: 6")).toBeInTheDocument();

    await userEvent.click(within(list).getAllByRole("button", { name: /Bosh logist/ })[0]!);
    expect(await screen.findByText("Bosh kuryerdan pulni bugun kechgacha olamiz.")).toBeInTheDocument();
    // ochilgan kanal o'qildi
    expect(await screen.findByText("O'qilmagan: 5")).toBeInTheDocument();
  });

  it("sends a message with an order link and shows it in the thread", async () => {
    await renderWithProviders(<ChatsScreen />, { searchParams: "?channel=11" });

    await screen.findByText("Bosh kuryerdan pulni bugun kechgacha olamiz.");
    await userEvent.click(screen.getByRole("button", { name: "Zakaz yoki lid havolasi" }));
    await userEvent.type(screen.getByLabelText("Raqam yoki ID"), "12345");
    await userEvent.type(screen.getByLabelText("Xabar"), "Shu zakazni tushuntiring");
    await userEvent.click(screen.getByRole("button", { name: "Yuborish" }));

    expect(await screen.findByText("Shu zakazni tushuntiring")).toBeInTheDocument();
    expect(screen.getByText(/№12345/)).toBeInTheDocument();
  });

  it("refuses an empty message on the client", async () => {
    await renderWithProviders(<ChatsScreen />, { searchParams: "?channel=11" });
    await screen.findByText("Bosh kuryerdan pulni bugun kechgacha olamiz.");
    await userEvent.click(screen.getByRole("button", { name: "Yuborish" }));
    expect(await screen.findByText("Matn yozing yoki fayl biriktiring.")).toBeInTheDocument();
  });

  it("keeps the channel and its history when the seat has no leader", async () => {
    mockSend("DELETE", "structure/filials/1/heads/chief_logist/");
    await renderWithProviders(<ChatsScreen />, { searchParams: "?channel=11" });

    expect(await screen.findByText("Bu o'rinda hozir rahbar yo'q")).toBeInTheDocument();
    expect(await screen.findByText("Bosh kuryerdan pulni bugun kechgacha olamiz.")).toBeInTheDocument();
    expect(screen.getAllByText("Rahbar tayinlanmagan").length).toBeGreaterThan(0);
  });

  it("hides the composer from a viewer", async () => {
    useSessionStore.setState({ canAct: false });
    await renderWithProviders(<ChatsScreen />, { searchParams: "?channel=12" });
    expect(await screen.findByText(/Ko'rish rejimi/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Xabar")).not.toBeInTheDocument();
  });
});
