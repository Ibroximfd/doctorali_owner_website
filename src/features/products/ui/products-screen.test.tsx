// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { failNext, useMockApi } from "@/shared/testing/server";

import { ProductsScreen } from "./products-screen";

const cardOf = (title: string): HTMLElement => {
  const card = screen.getByRole("heading", { name: title }).closest("section");
  if (!card) throw new Error(`"${title}" kartasi topilmadi`);
  return card;
};

/** KPI katagi: yorliq va qiymat bitta katak ichida. */
const tileOf = (label: string): HTMLElement => {
  const tile = screen.getByText(label).parentElement;
  if (!tile) throw new Error(`"${label}" katagi topilmadi`);
  return tile;
};

describe("ProductsScreen", () => {
  useMockApi();

  it("shows the four product KPIs, with stock warnings as a current state", async () => {
    await renderWithProviders(<ProductsScreen />, { searchParams: "?period=30d" });

    await screen.findByText("Sotilgan dona");
    const units = within(tileOf("Sotilgan dona"));
    expect(units.getByText("9 552")).toBeInTheDocument();
    expect(units.getByText("top 8 mahsulot")).toBeInTheDocument();

    // yetkazib berish (1 782 mln) + klinika do'koni (212 mln)
    expect(within(tileOf("Mahsulot tushumi")).getByText("1,99 mlrd")).toBeInTheDocument();

    const gifts = within(tileOf("Sovg'aga ketgan"));
    expect(gifts.getByText("87")).toBeInTheDocument();
    expect(gifts.getByText("tannarxi ≈ 13,9 mln so'm")).toBeInTheDocument();

    const stock = within(tileOf("Ombor ogohlantirishi"));
    expect(stock.getByText("6")).toBeInTheDocument();
    expect(stock.getByText("2 tugagan · 4 kam qolgan")).toBeInTheDocument();
    expect(stock.queryByText(/o'sdi|kamaydi/)).not.toBeInTheDocument();
  });

  it("ranks products by revenue and marks sold-out and low stock in words", async () => {
    await renderWithProviders(<ProductsScreen />, { searchParams: "?period=30d" });

    const table = within(await within(cardOf("Top mahsulotlar")).findByRole("table"));
    const rows = table.getAllByRole("row").slice(1);

    expect(rows).toHaveLength(8);
    const first = within(rows[0] as HTMLElement);
    expect(first.getByText("Rayhon krem 50 ml")).toBeInTheDocument();
    expect(first.getByText("Kremlar")).toBeInTheDocument();
    expect(first.getByText("412 mln")).toBeInTheDocument();
    expect(first.getByText("4 dona")).toBeInTheDocument();

    // qoldiq: tugagan — so'z bilan, yetarli — oddiy son, sovg'a yo'q — chiziqcha
    const soldOut = within(rows[2] as HTMLElement);
    expect(soldOut.getByText("Qora sedana yog'i 100 ml")).toBeInTheDocument();
    expect(soldOut.getByText("Tugadi")).toBeInTheDocument();
    expect(soldOut.getByText("—")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText("212")).toBeInTheDocument();
    expect(table.getAllByText("Tugadi")).toHaveLength(2);
  });

  it("lists categories by revenue with the total in the card header", async () => {
    await renderWithProviders(<ProductsScreen />, { searchParams: "?period=30d" });

    const categories = within(cardOf("Toifalar"));
    const items = await categories.findAllByRole("listitem");

    expect(items).toHaveLength(7);
    expect(items[0]).toHaveTextContent("Kremlar");
    expect(items[0]).toHaveTextContent("508 mln");
    expect(items[6]).toHaveTextContent("Siroplar");
    expect(categories.getByText("Jami 1,99 mlrd so'm")).toBeInTheDocument();
  });

  it("offers a retry in every block when the request fails, and the page stays up", async () => {
    failNext("products/");
    await renderWithProviders(<ProductsScreen />, { searchParams: "?period=30d" });

    expect(await screen.findAllByRole("button", { name: "Qayta urinish" })).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Top mahsulotlar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Toifalar" })).toBeInTheDocument();
  });

  it("scales sales with the filial but keeps the same products", async () => {
    await renderWithProviders(<ProductsScreen />, { searchParams: "?period=30d&filial=3" });

    await screen.findByText("Sotilgan dona");
    expect(within(tileOf("Sotilgan dona")).queryByText("9 552")).not.toBeInTheDocument();
    expect(within(tileOf("Sotilgan dona")).getByText("top 8 mahsulot")).toBeInTheDocument();
  });
});
