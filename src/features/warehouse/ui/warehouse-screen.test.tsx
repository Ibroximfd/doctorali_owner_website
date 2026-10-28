// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { failNext, useMockApi } from "@/shared/testing/server";

import { WarehouseScreen } from "./warehouse-screen";

const card = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`"${title}" kartasi topilmadi`);
  return section;
};

const AFTER_RETRY = { timeout: 4000 };

describe("WarehouseScreen", () => {
  useMockApi();

  it("shows the hero and stock KPIs", async () => {
    await renderWithProviders(<WarehouseScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "Ombor" })).toBeInTheDocument();
    expect(await screen.findByText("Jami qoldiq, dona")).toBeInTheDocument();
    expect(await screen.findByText("4 524")).toBeInTheDocument();
    expect(screen.getAllByText("Muammoli mahsulot").length).toBeGreaterThan(0);
  });

  it("lists warehouses with their keeper and opens the warehouse card", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<WarehouseScreen />);

    const grid = card("Omborlar");
    expect(await within(grid).findByText("Toshkent markaziy")).toBeInTheDocument();
    expect(within(grid).getByText("Sardor Aliyev")).toBeInTheDocument();
    expect(within(grid).getByText("Marketplace")).toBeInTheDocument();

    await user.click(within(grid).getByRole("button", { name: "Qo'qon omborini ochish" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Dilshod Qodirov")).toBeInTheDocument();
    expect(await within(dialog).findAllByText("Asal-propolis")).not.toHaveLength(0);
  });

  it("filters stock to problem products", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<WarehouseScreen />);

    const stock = card("Mahsulot qoldig'i");
    expect(await within(stock).findAllByText("Bo'g'im kremi")).not.toHaveLength(0);
    await user.click(within(stock).getByRole("button", { name: "Tugagan va kritik" }));
    await waitFor(() => expect(within(stock).queryAllByText("Yetarli")).toHaveLength(0));
    expect(within(stock).getAllByText("Kritik").length).toBeGreaterThan(0);
  });

  it("keeps the page alive when one block fails", async () => {
    failNext("warehouse/warehouses/");
    await renderWithProviders(<WarehouseScreen />);

    expect(await screen.findByText("4 524")).toBeInTheDocument();
    expect(
      await within(card("Omborlar")).findByRole("button", { name: /qayta/i }, AFTER_RETRY),
    ).toBeInTheDocument();
  });

  it("shows how stock left: full price, discount and gifts with reasons", async () => {
    await renderWithProviders(<WarehouseScreen />);
    const mix = card("Sotuv tarkibi");
    expect(await within(mix).findByText("Chegirma summasi")).toBeInTheDocument();
    expect(within(mix).getByText("Aksiya 2+1")).toBeInTheDocument();
    expect(within(mix).getByRole("img", { name: /Chiqim oqimi/ })).toBeInTheDocument();
    expect(within(mix).getAllByText("Mehrigiyo balzami").length).toBeGreaterThan(0);
  });

  it("shows when each product runs out on a 30-day scale", async () => {
    await renderWithProviders(<WarehouseScreen />);
    const runway = card("Tugash vaqti");
    const meters = await within(runway).findAllByRole("meter");
    expect(meters.length).toBeGreaterThan(0);
    expect(within(runway).getByText("bugun")).toBeInTheDocument();
  });
});
