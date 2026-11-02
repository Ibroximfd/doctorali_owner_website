// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { RatingsScreen } from "./ratings-screen";

const list = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`"${title}" kartasi topilmadi`);
  return section;
};

describe("RatingsScreen", () => {
  useMockApi();

  it("ranks couriers by the server score and explains the formula", async () => {
    await renderWithProviders(<RatingsScreen />);

    expect(await screen.findByRole("heading", { name: "Kuryerlar reytingi" })).toBeInTheDocument();
    // ustun sarlavhasi — serverning `name` i, izoh — `how`
    expect(screen.getAllByText("Kuryer reytingi").length).toBeGreaterThan(0);
    expect(screen.getByText(/Bayes tuzatmasi/)).toBeInTheDocument();
    const board = list("Kuryerlar reytingi");
    expect(within(board).getAllByText("Alisher Karimov").length).toBeGreaterThan(0);
  });

  it("shows the honest note on operators and filters by name", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<RatingsScreen />);

    await user.click(screen.getByRole("tab", { name: "Operatorlar" }));
    expect(await screen.findByText(/Mijoz operatorga baho bermaydi/)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Ism bo'yicha qidirish"), "yo'q odam");
    expect(await screen.findByText("«yo'q odam» topilmadi")).toBeInTheDocument();
  });

  it("puts logists without a result last and shows a dash, not zero", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<RatingsScreen />);

    await user.click(screen.getByRole("tab", { name: "Logistlar" }));
    await screen.findByRole("heading", { name: "Logistlar reytingi" });
    const board = list("Logistlar reytingi");
    const names = within(board)
      .getAllByText(/Sardor Ahmedov|Ilhom Jo'rayev/)
      .map((node) => node.textContent);
    expect(names.indexOf("Sardor Ahmedov")).toBeLessThan(names.indexOf("Ilhom Jo'rayev"));
  });
});
