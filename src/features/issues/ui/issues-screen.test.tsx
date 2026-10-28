// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { IssuesScreen } from "./issues-screen";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const WAREHOUSE = "Toshkent omborida Mehrigiyo balzami 3 kunga yetadi";

/** Desktop kengligi: tanlangan muammo ro'yxat yonidagi panelda. */
const asDesktop = () =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("min-width"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );

describe("IssuesScreen", () => {
  useMockApi();
  afterEach(() => vi.restoreAllMocks());

  it("lists open issues with their cause and responsible person", async () => {
    await renderWithProviders(<IssuesScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "Muammolar markazi" })).toBeInTheDocument();
    expect(await screen.findByText(WAREHOUSE)).toBeInTheDocument();
    expect(screen.getByText("Sardor Aliyev · skladchi")).toBeInTheDocument();
    expect(screen.queryByText("Bitrix sinxroni 3 marta ketma-ket xato berdi")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Ochiq · \d+$/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("filters by domain tile and switches the status tab", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<IssuesScreen />);
    await screen.findByText(WAREHOUSE);

    await user.click(screen.getByRole("button", { name: /^Moliya/ }));
    expect(await screen.findByText("Kuryer Jasur Karimovda 2 kundan beri 4,2 mln so'm")).toBeInTheDocument();
    // chiqib ketish animatsiyasi tugaguncha kutiladi
    await waitFor(() => expect(screen.queryByText(WAREHOUSE)).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^Hal bo'ldi/ }));
    await user.click(screen.getByRole("button", { name: /^Tizim/ }));
    expect(await screen.findByText("Bitrix sinxroni 3 marta ketma-ket xato berdi")).toBeInTheDocument();
  });

  it("opens the issue as a drawer on the phone and sends a message to the responsible person", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<IssuesScreen />);

    await user.click(await screen.findByRole("button", { name: new RegExp(WAREHOUSE) }));

    const dialog = await screen.findByRole("dialog");
    const message = await within(dialog).findByLabelText("Xabar matni");
    expect((message as HTMLTextAreaElement).value).toContain("Sardor, salom.");
    expect(within(dialog).getByRole("link", { name: "AI'dan so'rash" })).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Xabar yuborish" }));
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Xabar yuborildi: Sardor Aliyev"));
  });

  it("keeps the most serious issue open in the side panel on desktop", async () => {
    asDesktop();
    await renderWithProviders(<IssuesScreen />);

    const panel = await screen.findByRole("complementary", { name: "Tanlangan muammo" });
    expect(await within(panel).findByRole("heading", { level: 2, name: WAREHOUSE })).toBeInTheDocument();
    expect(await within(panel).findByLabelText("Xabar matni")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
