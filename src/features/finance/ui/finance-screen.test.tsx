// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { failNext, useMockApi } from "@/shared/testing/server";

import { FinanceScreen } from "./finance-screen";

/** Kartani sarlavhasi bo'yicha topadi (har karta — `section`). */
const card = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`"${title}" kartasi topilmadi`);
  return section;
};

describe("FinanceScreen", () => {
  useMockApi();

  it("shows the four headline numbers, with revenue equal to the Overview total", async () => {
    await renderWithProviders(<FinanceScreen />, { searchParams: "?period=30d" });

    // jami tushum — "Umumiy" sahifadagi bilan bir xil raqam
    expect(await screen.findByText("2,33 mlrd")).toBeInTheDocument();
    expect(screen.getByText("Yig'ilgan pul")).toBeInTheDocument();
    expect(screen.getByText("2,25 mlrd")).toBeInTheDocument();
    // xarajat: 412 mln, yig'ilgan pulning 18,3%
    expect(screen.getByText("yig'ilgan pulning 18,3%")).toBeInTheDocument();
    // sof qoldiq "taxminiy" deb yozilgan: 2 251 − 412 mln
    expect(screen.getByText("Sof qoldiq (taxminiy)")).toBeInTheDocument();
    expect(screen.getByText("1,84 mlrd")).toBeInTheDocument();
  });

  it("explains the cash flow with refunds, the average daily inflow and the biggest expense", async () => {
    await renderWithProviders(<FinanceScreen />, { searchParams: "?period=30d" });

    // grafik kelgach karta legendli ko'rinishga almashadi — avval shuni, keyin ko'rsatkichlarni kutamiz
    await screen.findByText("Chiqim");
    await screen.findByText("Qaytarishlar");
    const cashflow = within(card("Kirim va chiqim"));
    expect(cashflow.getByText("Kirim")).toBeInTheDocument();
    expect(cashflow.getByText("23 ta buyurtma")).toBeInTheDocument();
    // 2 251 mln ÷ 30 kun
    expect(cashflow.getByText("75,0 mln")).toBeInTheDocument();
    expect(cashflow.getByText("Ish haqi")).toBeInTheDocument();
    expect(cashflow.getByText("45,1% · 186 mln so'm")).toBeInTheDocument();
  });

  it("keeps the cash-flow highlights when the chart itself fails", async () => {
    failNext("finance/cashflow/");
    await renderWithProviders(<FinanceScreen />, { searchParams: "?period=30d" });

    const cashflow = within(card("Kirim va chiqim"));
    expect(await cashflow.findByRole("button", { name: "Qayta urinish" })).toBeInTheDocument();
    expect(await cashflow.findByText("O'rtacha kunlik kirim")).toBeInTheDocument();
    expect(cashflow.getByText("75,0 mln")).toBeInTheDocument();
  });

  it("shows where the money is, split by till, couriers, online accounts and debt", async () => {
    await renderWithProviders(<FinanceScreen />);

    const position = within(card("Pul qayerda turibdi"));
    expect(await position.findByText("Klinika kassalari")).toBeInTheDocument();
    expect(position.getByText("18,4 mln")).toBeInTheDocument();
    expect(position.getByText("Terminal")).toBeInTheDocument();
    expect(position.getByText("6 kuryer")).toBeInTheDocument();
    expect(position.getByText("Click · Payme")).toBeInTheDocument();
    // muddati o'tgan qism alohida qatorda, kritik rangda
    expect(position.getByText("muddati o'tgan")).toHaveClass("text-crit");
    expect(position.getByText("8,6 mln")).toHaveClass("text-crit");
  });

  it("breaks the money down by payment method, expense category and liabilities", async () => {
    await renderWithProviders(<FinanceScreen />, { searchParams: "?period=30d" });

    const mix = within(card("To'lov usullari"));
    expect(await mix.findByText("Payme")).toBeInTheDocument();
    expect(mix.getByText("1,28 mlrd")).toBeInTheDocument();

    const expenses = within(card("Xarajatlar"));
    expect(await expenses.findByText("Jami 412 mln so'm")).toBeInTheDocument();
    expect(expenses.getByText("Sarf materiallari")).toBeInTheDocument();

    const liabilities = within(card("Majburiyatlar"));
    expect(await liabilities.findByText("Keshbek ballari")).toBeInTheDocument();
    expect(liabilities.getByText("· 11 shifokor")).toBeInTheDocument();
    expect(liabilities.getByText("Jami majburiyat")).toBeInTheDocument();
    expect(liabilities.getByText("115 mln so'm")).toBeInTheDocument();
  });

  it("lists client debt by age with the biggest debtors and the daily cash-desk closings", async () => {
    await renderWithProviders(<FinanceScreen />, { searchParams: "?period=30d" });

    const debts = within(card("Mijozlar qarzi"));
    expect(await debts.findByText("Ochiq 31,2 mln so'm · 63 mijoz")).toBeInTheDocument();
    expect(debts.getByText("31+ kun")).toBeInTheDocument();
    // jadval telefonda kartalarga aylanadi — qator ikkala ko'rinishda ham bor
    expect(debts.getAllByText("Baxtiyor Normatov").length).toBeGreaterThan(0);
    expect(debts.getAllByText("46 kun").length).toBeGreaterThan(0);

    const closings = within(card("Kunlik kassa yopilishi"));
    expect((await closings.findAllByText("Qayta ochilgan")).length).toBeGreaterThan(0);
    expect(closings.getAllByText("−180 000")[0]).toHaveClass("text-crit");
    expect(closings.getAllByText("+20 000")[0]).toHaveClass("text-warn");
  });

  it("keeps the rest of the page working when one block fails", async () => {
    failNext("finance/debts/");
    await renderWithProviders(<FinanceScreen />, { searchParams: "?period=30d" });

    expect(await screen.findByText("2,33 mlrd")).toBeInTheDocument();
    expect(
      await within(card("Mijozlar qarzi")).findByRole("button", { name: "Qayta urinish" }),
    ).toBeInTheDocument();
    expect((await within(card("Kunlik kassa yopilishi")).findAllByText("Yopilgan")).length).toBeGreaterThan(
      0,
    );
  });

  it("says so when the selected branch has no clinic debt and no closings", async () => {
    await renderWithProviders(<FinanceScreen />, { searchParams: "?period=30d&filial=3" });

    expect(await within(card("Mijozlar qarzi")).findByText("Ochiq qarz yo'q")).toBeInTheDocument();
    expect(
      await within(card("Kunlik kassa yopilishi")).findByText("Bu davrda ma'lumot yo'q"),
    ).toBeInTheDocument();
    // Samarqand tushumi "Umumiy" dagi filial qatori bilan bir xil
    expect(await screen.findByText("420 mln")).toBeInTheDocument();
  });

  it("hides comparison deltas when the owner turns comparison off", async () => {
    await renderWithProviders(<FinanceScreen />, { searchParams: "?period=30d&compare=none" });

    await screen.findByText("2,33 mlrd");
    expect(screen.queryByText(/o'sdi|kamaydi/)).not.toBeInTheDocument();
  });
});
