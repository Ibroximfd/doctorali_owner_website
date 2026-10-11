// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { failNext, server, useMockApi } from "@/shared/testing/server";

import { ClinicScreen } from "./clinic-screen";
import { ClinicSubtitle } from "./clinic-subtitle";

/** Karta — sarlavhasi (`h2`) bo'yicha topiladi. */
const card = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`"${title}" kartasi topilmadi`);
  return section;
};

/** KPI katagi — yorlig'i bo'yicha. */
const tile = (label: string): HTMLElement => {
  const element = screen.getByText(label).parentElement;
  if (!element) throw new Error(`"${label}" katagi topilmadi`);
  return element;
};

/** Xato holati `ky` ning bitta qayta urinishidan keyin chiqadi — odatdagi 1 soniyadan ko'proq kutamiz. */
const AFTER_RETRY = { timeout: 4000 };

describe("ClinicScreen", () => {
  useMockApi();
  afterEach(() => server.events.removeAllListeners());

  it("shows the KPIs, revenue mix, visits, branches, doctors and the warehouse", async () => {
    await renderWithProviders(<ClinicScreen />);

    expect(await screen.findByText("Klinika tushumi")).toBeInTheDocument();
    expect(within(tile("Klinika tushumi")).getByText("486 mln")).toBeInTheDocument();
    expect(within(tile("Tashriflar (keldi)")).getByText("2 140")).toBeInTheDocument();
    expect(within(tile("Kelmaganlar")).getByText("9,3%")).toBeInTheDocument();
    expect(within(tile("O'rtacha chek")).getByText("227 000")).toBeInTheDocument();

    // grafik kartasi ma'lumot kelgach qayta chiziladi — avval legendni kutamiz, keyin kartani olamiz
    expect(await screen.findByText("Mahsulot sotuvi")).toBeInTheDocument();
    expect(within(card("Tushum tarkibi")).getByText("Konsultatsiyalar")).toBeInTheDocument();

    const visits = card("Tashriflar");
    expect(await within(visits).findByText("2 486 ta yozilgan")).toBeInTheDocument();
    expect(within(visits).getByText("Kelmadi")).toBeInTheDocument();
    expect(within(visits).getByText("1 654")).toBeInTheDocument();

    // jadval va telefon kartalari bir vaqtda DOM da — har matn ikki marta uchraydi
    const branches = card("Filiallar");
    expect(await within(branches).findAllByText("Qo'qon")).toHaveLength(2);
    expect(within(branches).getAllByText("Yopilgan · farqsiz")).toHaveLength(2);
    expect(within(branches).getAllByText("Kamomad −180 000")).toHaveLength(2);

    const warehouse = card("Ombor");
    expect(await within(warehouse).findByText("Na'matak siropi")).toBeInTheDocument();
    expect(within(warehouse).getAllByText("Tugadi")).toHaveLength(2);
    expect(within(warehouse).getByText("Toshkent · minimal 10 dona")).toBeInTheDocument();
    expect(within(warehouse).getByRole("link", { name: "Mahsulotlar" })).toHaveAttribute("href", "/products");
  });

  it("lists the five best-selling doctors with a link to the full ranking", async () => {
    await renderWithProviders(<ClinicScreen />);

    const doctors = card("Shifokorlar");
    expect(await within(doctors).findAllByText("Ali Valiyev")).toHaveLength(2);
    expect(within(doctors).getAllByText("Terapevt · Toshkent")).toHaveLength(2);
    // oltinchi o'rindagi shifokor bu yerda ko'rinmaydi
    expect(within(doctors).queryByText("Kamola Yusupova")).not.toBeInTheDocument();
    expect(within(doctors).getByRole("link", { name: "Batafsil" })).toHaveAttribute("href", "/doctors");
  });

  it("keeps the rest of the page working when one block fails", async () => {
    failNext("clinic/warehouse/");
    await renderWithProviders(<ClinicScreen />);

    expect(await screen.findByText("486 mln")).toBeInTheDocument();
    expect(
      await within(card("Ombor")).findByRole("button", { name: "Qayta urinish" }, AFTER_RETRY),
    ).toBeInTheDocument();
    expect(await within(card("Filiallar")).findAllByText("Toshkent")).toHaveLength(2);
  });

  it("explains that the selected filial has no clinic without asking the clinic API", async () => {
    const requested: string[] = [];
    server.events.on("request:start", ({ request }) => requested.push(new URL(request.url).pathname));

    await renderWithProviders(<ClinicScreen />, { searchParams: "?filial=3" });

    expect(await screen.findByText("Samarqand filialida klinika yo'q")).toBeInTheDocument();
    expect(screen.queryByText("Klinika tushumi")).not.toBeInTheDocument();
    expect(requested).toContain("/api/owner/meta/");
    expect(requested.filter((path) => path.includes("/clinic/"))).toEqual([]);
  });

  it("clears the filial filter from the empty state", async () => {
    await renderWithProviders(<ClinicScreen />, { searchParams: "?filial=3" });

    await userEvent.click(await screen.findByRole("button", { name: "Barcha filiallarni ko'rsatish" }));

    expect(await screen.findByText("Klinika tushumi")).toBeInTheDocument();
    expect(screen.queryByText("Samarqand filialida klinika yo'q")).not.toBeInTheDocument();
  });
});

describe("ClinicSubtitle", () => {
  useMockApi();

  it("names the clinics the numbers cover", async () => {
    await renderWithProviders(<ClinicSubtitle />);

    expect(await screen.findByText("Qabulxona, kassa va ombor · Toshkent va Qo'qon")).toBeInTheDocument();
  });

  it("names only the selected clinic", async () => {
    await renderWithProviders(<ClinicSubtitle />, { searchParams: "?filial=2,3" });

    expect(await screen.findByText("Qabulxona, kassa va ombor · Qo'qon")).toBeInTheDocument();
  });
});
