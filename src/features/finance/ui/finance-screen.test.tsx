// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { FinanceScreen } from "./finance-screen";

const card = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`"${title}" kartasi yo'q`);
  return section;
};

describe("FinanceScreen", () => {
  useMockApi();

  it("shows where the money is, per filial, and the chief courier fee at one rate", async () => {
    await renderWithProviders(<FinanceScreen />, { searchParams: "?period=30d" });

    expect((await screen.findAllByText("Filiallarga topshirildi")).length).toBeGreaterThan(0);
    const fee = within(card("Bosh kuryer haqi"));
    expect(await fee.findByText(/25 000/)).toBeInTheDocument();
    const chiefs = within(card("Bosh kuryerlar bilan hisob"));
    expect((await chiefs.findAllByText("Farhod Normatov")).length).toBeGreaterThan(0);
    expect(within(card("Filiallarga topshirilgan pul")).getAllByText("Kechikdi").length).toBeGreaterThan(0);
  });

  it("maps every region with a tooltip and shows the numbers of a picked region", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<FinanceScreen />, { searchParams: "?period=30d" });

    const map = within(card("Viloyatlar"));
    const regions = await map.findAllByRole("button", { name: /so'm · .* ta sotildi/ });
    expect(regions).toHaveLength(14);

    const fergana = await map.findByRole("button", { name: /^Farg'ona:/ });
    fireEvent.pointerEnter(fergana);
    expect(await map.findAllByText("Atkaz")).not.toHaveLength(0);

    await user.click(fergana);
    expect(map.getAllByText("Farg'ona").length).toBeGreaterThan(0);
    expect(map.getAllByText("Pul").length).toBeGreaterThan(0);
  });
});
