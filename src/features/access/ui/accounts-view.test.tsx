// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { AccessScreen } from "./access-screen";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("Platform accounts", () => {
  useMockApi();

  it("lists accounts by department with the AI hint about unused permissions", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AccessScreen />);

    await user.click(screen.getByRole("tab", { name: "Platforma akkauntlari" }));
    expect(
      await screen.findByRole("button", { name: "Sardor Aliyev akkauntini ochish" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/30 kundan beri ishlatilmagan/)).toBeInTheDocument();
    expect(screen.getByText("Bloklangan")).toBeInTheDocument();
  });

  it("creates a warehouse head from the template and fine-tunes permissions", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AccessScreen />);
    await user.click(screen.getByRole("tab", { name: "Platforma akkauntlari" }));
    await user.click(await screen.findByRole("button", { name: "Akkaunt ochish" }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("F.I.Sh."), "Bekzod Tursunov");
    await user.clear(within(dialog).getByLabelText("Telefon"));
    await user.type(within(dialog).getByLabelText("Telefon"), "+998977770011");
    await user.click(within(dialog).getByRole("button", { name: /^Ombor/ }));
    await user.click(await within(dialog).findByRole("button", { name: /Sklad boshlig'i/ }));
    expect(
      within(dialog).getByRole("button", { name: /Prixod kiritish/, pressed: true }),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /Tannarx/ }));
    expect(within(dialog).getByText(/maxfiy ruxsat tanlandi/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Akkaunt ochish" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Bekzod Tursunov uchun akkaunt ochildi — taklif yuborildi"),
    );
  });

  it("does not save an incomplete account", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AccessScreen />);
    await user.click(screen.getByRole("tab", { name: "Platforma akkauntlari" }));
    await user.click(await screen.findByRole("button", { name: "Akkaunt ochish" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Akkaunt ochish" }));
    expect(within(dialog).getByText("Bo'limni tanlang")).toBeInTheDocument();
    expect(within(dialog).getByText("Telefon: +998 va 9 raqam")).toBeInTheDocument();
  });

  it("shows templates and who sees what as a level matrix with the AI watch", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AccessScreen />);
    await user.click(screen.getByRole("tab", { name: "Platforma akkauntlari" }));

    const tiles = await screen.findByRole("region", { name: "Shablonlar" });
    expect(within(tiles).getByRole("button", { name: /Sklad boshlig'i/ })).toBeInTheDocument();

    const matrix = await screen.findByRole("table", { name: "Kim nimani ko'radi" });
    const row = within(matrix)
      .getByRole("button", { name: "Sardor Aliyev ruxsatlari" })
      .closest("[role=row]");
    if (!(row instanceof HTMLElement)) throw new Error("qator yo'q");
    expect(within(row).getByRole("cell", { name: "Ombor: Boshqaruv" })).toBeInTheDocument();
    expect(within(row).getByRole("cell", { name: "Kuryerlar: Ko'rish" })).toBeInTheDocument();
    expect(within(row).getByRole("cell", { name: "Call-center: Yo'q" })).toBeInTheDocument();

    const ai = screen.getByRole("region", { name: "AI kuzatuvi" });
    expect(within(ai).getByText(/Sardor Aliyev: 1 ta ruxsat/)).toBeInTheDocument();
    await user.click(within(ai).getByRole("button", { name: "Akkauntni ko'rib chiqish" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
