// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { MobileAppScreen } from "./mobile-app-screen";

const card = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`"${title}" kartasi yo'q`);
  return section;
};

describe("MobileAppScreen", () => {
  useMockApi();

  it("shows app orders with statuses, filials, and users with DAU and MAU", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<MobileAppScreen />, { searchParams: "?period=30d" });

    expect((await screen.findAllByText("Tushgan zakazlar")).length).toBeGreaterThan(0);
    const statuses = within(card("Holatlar"));
    for (const label of ["Kutilmoqda", "Tasdiqlandi", "Yo'lda", "Yetkazildi", "Atkaz"])
      expect(await statuses.findByText(label)).toBeInTheDocument();
    expect((await within(card("Filiallar kesimida")).findAllByText("Toshkent 2")).length).toBeGreaterThan(0);

    expect((await screen.findAllByText("Jami foydalanuvchi")).length).toBeGreaterThan(0);
    const chart = within(card("Aktiv foydalanuvchilar"));
    await user.click(chart.getByRole("button", { name: "MAU" }));
    expect(chart.getByRole("button", { name: "MAU" })).toHaveAttribute("aria-pressed", "true");
  });

  it("lists operators by people brought into the app, filterable by filial", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<MobileAppScreen />, { searchParams: "?period=30d" });

    const operators = within(card("Operatorlar ilovaga olib kirganlar"));
    expect((await operators.findAllByText("Aziza Mirzayeva")).length).toBeGreaterThan(0);
    await user.click(operators.getByRole("button", { name: "T2" }));
    expect((await operators.findAllByText("Feruza Olimova")).length).toBeGreaterThan(0);
    expect(operators.queryByText("Aziza Mirzayeva")).not.toBeInTheDocument();
    await user.click(operators.getByRole("button", { name: "Ism" }));
    expect(operators.getByRole("button", { name: "Ism" })).toHaveAttribute("aria-pressed", "true");
  });
});
