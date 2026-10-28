// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { AccessScreen } from "./access-screen";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("AccessScreen", () => {
  useMockApi();

  it("lists who can see which section, with scope and expiry", async () => {
    await renderWithProviders(<AccessScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "Ruxsatlar" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Sardor Aliyev" })).toBeInTheDocument();
    expect(screen.getByText(/kun qoldi/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Nodira Rasulova" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Qoldiqni operatorlarga aytib turish uchun", { exact: false }),
    ).toBeInTheDocument();
  });

  it("grants read-only access with a template", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AccessScreen />);
    await screen.findByRole("heading", { name: "Sardor Aliyev" });

    await user.click(screen.getByRole("button", { name: "Ruxsat berish" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(await within(dialog).findByRole("button", { name: /Javohir Ergashev/ }));
    await user.click(await within(dialog).findByRole("button", { name: /Call-center admini/ }));
    expect(within(dialog).getByRole("button", { name: /Ombor/, pressed: true })).toBeInTheDocument();
    expect(within(dialog).getByText(/Javohir Ergashev quyidagilarni ko'radi: Ombor/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Ruxsat berish" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Javohir Ergashev uchun ruxsat ochildi"));
    expect(await screen.findByRole("heading", { name: "Javohir Ergashev" })).toBeInTheDocument();
  });

  it("does not save without a person and a section", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AccessScreen />);
    await screen.findByRole("heading", { name: "Sardor Aliyev" });

    await user.click(screen.getByRole("button", { name: "Ruxsat berish" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Ruxsat berish" }));
    expect(within(dialog).getByText("Xodimni tanlang")).toBeInTheDocument();
    expect(within(dialog).getByText("Kamida bitta bo'lim tanlang")).toBeInTheDocument();
  });

  it("revokes access after confirmation", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AccessScreen />);
    await screen.findByRole("heading", { name: "Sardor Aliyev" });

    const [revoke] = screen.getAllByRole("button", { name: "Bekor qilish" });
    if (!revoke) throw new Error("tugma yo'q");
    await user.click(revoke);
    await user.click(await screen.findByRole("button", { name: "Ha, yopilsin" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Sardor Aliyev uchun ruxsat yopildi"));
  });
});
