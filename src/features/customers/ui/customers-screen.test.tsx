// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { failNext, useMockApi } from "@/shared/testing/server";

import { CustomersScreen } from "./customers-screen";

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

describe("CustomersScreen", () => {
  useMockApi();

  it("shows the six customer KPIs", async () => {
    await renderWithProviders(<CustomersScreen />, { searchParams: "?period=30d" });

    await screen.findByText("Jami mijozlar");
    expect(within(tileOf("Jami mijozlar")).getByText("61 300")).toBeInTheDocument();
    expect(within(tileOf("Yangi mijozlar")).getByText("1 284")).toBeInTheDocument();
    expect(within(tileOf("Qaytgan mijozlar ulushi")).getByText("43,6%")).toBeInTheDocument();

    const repeat = within(tileOf("Takroriy xarid"));
    expect(repeat.getByText("38,2%")).toBeInTheDocument();
    expect(repeat.getByText("90 kun ichida 2+ buyurtma")).toBeInTheDocument();

    expect(within(tileOf("Mijoz qiymati (o'rtacha)")).getByText("1 480 000")).toBeInTheDocument();
    expect(within(tileOf("Bir mijozga buyurtma")).getByText("2,4")).toBeInTheDocument();
  });

  it("renders the cohort table with a described, focusable cell for every elapsed month", async () => {
    await renderWithProviders(<CustomersScreen />, { searchParams: "?period=30d" });

    const cohorts = within(cardOf("Kogorta: mijozlar qaytishi"));
    const table = within(await cohorts.findByRole("table"));

    expect(table.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Birinchi xarid",
      "Mijoz",
      "0-oy",
      "1-oy",
      "2-oy",
      "3-oy",
      "4-oy",
      "5-oy",
    ]);
    expect(table.getAllByRole("rowheader")).toHaveLength(6);
    // 6 + 5 + 4 + 3 + 2 + 1 — faqat o'tgan oylar
    expect(table.getAllByRole("button")).toHaveLength(21);

    const cell = table.getByRole("button", { name: /^Aprel kogortasi, 1-oy: 36% qaytdi — 399 mijoz$/i });
    expect(cell).toHaveTextContent("36%");
    cell.focus();
    expect(cell).toHaveFocus();

    expect(cohorts.getByText("kam qaytdi")).toBeInTheDocument();
    expect(cohorts.getByText("ko'p qaytdi")).toBeInTheDocument();
  });

  it("shows the new-vs-returning chart, the top customers and the regions", async () => {
    await renderWithProviders(<CustomersScreen />, { searchParams: "?period=30d" });

    // legend ma'lumot kelgach chiqadi — karta shundan keyin qidiriladi (yuklanish kartasi almashadi)
    await screen.findByText("Qaytgan");
    const mix = within(cardOf("Yangi va qaytgan mijozlar"));
    expect(mix.getByText("Yangi")).toBeInTheDocument();
    expect(mix.getByRole("group", { name: "Ko'rinish" })).toBeInTheDocument();

    const top = within(await within(cardOf("Eng qimmatli mijozlar")).findByRole("table"));
    expect(top.getAllByRole("row")).toHaveLength(7);
    expect(top.getByText("Dilfuza Karimova")).toBeInTheDocument();
    expect(await top.findByText("Toshkent shahri · +998 90 987 65 43")).toBeInTheDocument();
    expect(top.getByText("9,8 mln")).toBeInTheDocument();
    expect(top.getAllByText("02.10.2026").length).toBeGreaterThan(0);
    expect(top.getAllByText("Bor")).toHaveLength(4);
    expect(top.getAllByText("Yo'q")).toHaveLength(2);

    const regions = within(cardOf("Mijozlar hududlar bo'yicha"));
    expect(await regions.findAllByRole("listitem")).toHaveLength(7);
    expect(regions.getByText("Eng faol 7 hudud")).toBeInTheDocument();
    expect(await regions.findByText("Toshkent shahri")).toBeInTheDocument();
  });

  it("keeps the rest of the page working when one block fails", async () => {
    failNext("customers/cohorts/");
    await renderWithProviders(<CustomersScreen />, { searchParams: "?period=30d" });

    expect(await screen.findByText("61 300")).toBeInTheDocument();
    // jadval va telefon kartalari — ikkalasi ham DOM da
    expect(
      (await within(cardOf("Eng qimmatli mijozlar")).findAllByText("Rustam Qodirov")).length,
    ).toBeGreaterThan(0);
    expect(
      await within(cardOf("Kogorta: mijozlar qaytishi")).findByRole("button", { name: "Qayta urinish" }),
    ).toBeInTheDocument();
  });

  it("hides comparison deltas when comparison is turned off", async () => {
    await renderWithProviders(<CustomersScreen />, { searchParams: "?period=30d&compare=none" });

    await screen.findByText("61 300");
    expect(screen.queryByText(/o'sdi|kamaydi/)).not.toBeInTheDocument();
  });
});
