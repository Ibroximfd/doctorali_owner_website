// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { AnalyticsScreen } from "./analytics-screen";

const card = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`"${title}" kartasi yo'q`);
  return section;
};

describe("AnalyticsScreen", () => {
  useMockApi();

  it("compares filials and products, then operators inside the picked filial", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AnalyticsScreen />, { searchParams: "?period=30d" });

    const products = within(card("Mahsulotlar"));
    expect((await products.findAllByText("Kardiomed")).length).toBeGreaterThan(0);
    expect(products.getAllByText("Atkazi eng ko'p").length).toBeGreaterThan(0);

    const operators = within(card("Operatorlar"));
    expect((await operators.findAllByText("Dilnoza Karimova")).length).toBeGreaterThan(0);
    await user.click(operators.getByRole("button", { name: "T2 · Toshkent 2" }));
    expect((await operators.findAllByText("Feruza Olimova")).length).toBeGreaterThan(0);
    expect(operators.queryByText("Dilnoza Karimova")).not.toBeInTheDocument();
  });

  it("with «Ilovadan» explains there is no operator in app orders", async () => {
    await renderWithProviders(<AnalyticsScreen />, { searchParams: "?period=30d&source=app" });

    const operators = within(card("Operatorlar"));
    expect(await operators.findByText("Ilova zakazlarida operator yo'q")).toBeInTheDocument();
    expect((await within(card("Mahsulotlar")).findAllByText("Kardiomed")).length).toBeGreaterThan(0);
  });
});
