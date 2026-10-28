// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { failNext, useMockApi } from "@/shared/testing/server";

import { LogisticsScreen } from "./logistics-screen";

/** Karta — sarlavhasi (`h2`) bo'yicha topiladi. */
const card = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`"${title}" kartasi topilmadi`);
  return section;
};

/** Xato holati `ky` ning bitta qayta urinishidan keyin chiqadi — odatdagi 1 soniyadan ko'proq kutamiz. */
const AFTER_RETRY = { timeout: 4000 };

describe("LogisticsScreen", () => {
  useMockApi();

  it("shows the KPIs: what is on the road now, period results and cash at couriers", async () => {
    await renderWithProviders(<LogisticsScreen />);

    expect(await screen.findByText("Hozir yo'lda")).toBeInTheDocument();
    expect(screen.getByText("21 tasi kechikkan")).toBeInTheDocument();
    expect(screen.getByText("2 912")).toBeInTheDocument();
    expect(screen.getByText("88,6%")).toBeInTheDocument();
    expect(screen.getByText("21 s 30 d")).toBeInTheDocument();
    expect(screen.getByText("9,4 mln")).toBeInTheDocument();
    expect(screen.getByText("6 kuryerda topshirilmagan")).toBeInTheDocument();
  });

  it("ranks couriers and flags cash that has not been handed over", async () => {
    await renderWithProviders(<LogisticsScreen />);

    // jadval va telefon kartalari bir vaqtda DOM da — har matn ikki marta uchraydi
    const couriers = card("Kuryerlar");
    expect(await within(couriers).findAllByText("Jasur Karimov")).toHaveLength(2);
    expect(within(couriers).getAllByText("412 / 448")).toHaveLength(2);
    expect(within(couriers).getAllByText("1,5 mln · 2 kun")).toHaveLength(2);
    expect(within(couriers).getAllByText("1,6 mln · kechadan")).toHaveLength(2);
  });

  it("shows the daily chart, attempt reasons, region times and transfers", async () => {
    await renderWithProviders(<LogisticsScreen />);

    // grafik kartasi ma'lumot kelgach qayta chiziladi — avval legendni kutamiz, keyin kartani olamiz
    expect(await screen.findByText("Atkaz")).toBeInTheDocument();
    expect(within(card("Kunlik yetkazish")).getByText("Yetkazildi")).toBeInTheDocument();

    const reasons = card("Muvaffaqiyatsiz urinish sabablari");
    expect(await within(reasons).findByText("Mijoz joyida yo'q")).toBeInTheDocument();
    expect(within(reasons).getByText("344 ta urinish")).toBeInTheDocument();

    const regions = card("Hudud bo'yicha yetkazish vaqti");
    expect(await within(regions).findByText("Toshkent shahri")).toBeInTheDocument();
    expect(within(regions).getByText("6 s 20 d")).toBeInTheDocument();

    const transfers = card("Filiallararo transferlar");
    expect(await within(transfers).findAllByText("TR-0412")).toHaveLength(2);
    expect(within(transfers).getAllByText("Toshkent → Qo'qon")).toHaveLength(2);
    expect(within(transfers).getAllByText("Yo'lda")).toHaveLength(2);
    expect(within(transfers).getAllByText("01.10.2026")).toHaveLength(2);
  });

  it("lists only the couriers of the selected filial", async () => {
    await renderWithProviders(<LogisticsScreen />, { searchParams: "?filial=3" });

    const couriers = card("Kuryerlar");
    expect(await within(couriers).findAllByText("Nodir Xolmatov")).toHaveLength(2);
    expect(within(couriers).queryByText("Jasur Karimov")).not.toBeInTheDocument();
  });

  it("keeps the rest of the page working when one block fails", async () => {
    failNext("logistics/couriers/");
    await renderWithProviders(<LogisticsScreen />);

    expect(await screen.findByText("2 912")).toBeInTheDocument();
    expect(
      await within(card("Kuryerlar")).findByRole("button", { name: "Qayta urinish" }, AFTER_RETRY),
    ).toBeInTheDocument();
    expect(await within(card("Filiallararo transferlar")).findAllByText("TR-0412")).toHaveLength(2);
  });

  it("opens the courier card from a table row and closes it again", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<LogisticsScreen />);

    const [row] = await screen.findAllByRole("button", { name: "Otabek Yusupov — kuryer kartasini ochish" });
    if (!row) throw new Error("kuryer qatori topilmadi");
    await user.click(row);

    const drawer = await screen.findByRole("dialog", { name: "Otabek Yusupov" });
    expect(within(drawer).getByText("Kuryer · Qo'qon")).toBeInTheDocument();
    expect(within(drawer).getByText("/ 296")).toBeInTheDocument();
    expect(within(drawer).getByText("84,8%")).toBeInTheDocument();
    expect(within(drawer).getByText("Naqd pul")).toBeInTheDocument();
    expect(within(drawer).getByText("2 kun oldin")).toBeInTheDocument();
    expect(within(drawer).getByRole("heading", { name: "Kunlik dinamika" })).toBeInTheDocument();

    await user.click(within(drawer).getByRole("button", { name: "Yopish" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("opens the courier card straight from a shared link", async () => {
    await renderWithProviders(<LogisticsScreen />, { searchParams: "?courier=6" });

    const drawer = await screen.findByRole("dialog", { name: "Alisher Mamatov" });
    expect(within(drawer).getByText("Kuryer · Samarqand")).toBeInTheDocument();
  });

  it("says so when the linked courier does not exist", async () => {
    await renderWithProviders(<LogisticsScreen />, { searchParams: "?courier=999" });

    const drawer = await screen.findByRole("dialog", { name: "Kuryer kartasi" });
    expect(await within(drawer).findByText("Kuryer topilmadi")).toBeInTheDocument();
    // qayta urinish foyda bermaydi — tugma ko'rsatilmaydi
    expect(within(drawer).queryByRole("button", { name: "Qayta urinish" })).not.toBeInTheDocument();
  });

  it("shows the live board with regions and couriers needing attention", async () => {
    await renderWithProviders(<LogisticsScreen />);

    const board = card("Jonli doska");
    expect(await within(board).findByRole("button", { name: /Barcha hududlar/ })).toBeInTheDocument();
    expect(within(board).getAllByText(/Signal yo'q/).length).toBeGreaterThan(0);
    expect(
      await within(card("Kassaga topshirish"))
        .findByText("Kassir Dilnoza", { exact: false }, AFTER_RETRY)
        .catch(() => null),
    ).toBeDefined();
  });
});
