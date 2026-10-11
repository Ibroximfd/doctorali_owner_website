// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { failNext, useMockApi } from "@/shared/testing/server";

import { OrderDrawer } from "./order-drawer";
import { OrdersScreen } from "./orders-screen";

/** Karta sarlavhasi bo'yicha blokni topadi (`Card` — `section`). */
const card = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (section === null) throw new Error(`"${title}" kartasi topilmadi`);
  return section;
};

/** KPI katagi: yorliq va qiymat bitta katak ichida. */
const kpi = async (label: string): Promise<HTMLElement> => {
  const tile = (await screen.findByText(label)).parentElement;
  if (tile === null) throw new Error(`"${label}" KPI katagi topilmadi`);
  return tile;
};

/** Jadval desktop va telefon ko'rinishida ikki marta chiziladi — birinchisi (jadval qatori) olinadi. */
const orderRow = async (scope: HTMLElement, number: string): Promise<HTMLElement> => {
  const [row] = await within(scope).findAllByRole("button", { name: `${number} buyurtmasini ochish` });
  if (row === undefined) throw new Error(`${number} qatori topilmadi`);
  return row;
};

const queryOrderRows = (scope: HTMLElement, number: string): HTMLElement[] =>
  within(scope).queryAllByRole("button", { name: `${number} buyurtmasini ochish` });

describe("OrdersScreen", () => {
  useMockApi();

  it("shows the KPIs, the funnel and every breakdown block", async () => {
    await renderWithProviders(<OrdersScreen />, { searchParams: "?period=30d" });

    expect(within(await kpi("Jami buyurtma")).getByText("3 860")).toBeInTheDocument();
    expect(within(await kpi("Tasdiqlash ulushi")).getByText("90,4%")).toBeInTheDocument();
    expect(within(await kpi("Atkaz ulushi")).getByText("12,6%")).toBeInTheDocument();
    expect(within(await kpi("O'rtacha yetkazish vaqti")).getByText("21 s 30 d")).toBeInTheDocument();

    const funnel = card("Buyurtma voronkasi");
    expect(await within(funnel).findByText("Yo'lga chiqdi")).toBeInTheDocument();
    expect(within(funnel).getByText("Hali jarayonda")).toBeInTheDocument();
    expect(within(funnel).getByText("462")).toBeInTheDocument();

    expect(await within(card("Kunlik dinamika")).findByText("Yaratildi")).toBeInTheDocument();
    expect(await within(card("Manba")).findByText("Operator (CRM)")).toBeInTheDocument();
    expect(
      await within(card("Hududlar")).findByRole("button", { name: "Samarqand: 421" }),
    ).toBeInTheDocument();
    expect(within(card("Hududlar")).getByText(/Eng ko'p:/)).toHaveTextContent(
      "Toshkent shahri — 742 · Toshkent viloyati — 498 · Samarqand — 421",
    );

    const reasons = card("Atkaz sabablari");
    expect(await within(reasons).findByText("Boshqa sabablar")).toBeInTheDocument();
    expect(within(reasons).getByText("486 ta bekor qilingan")).toBeInTheDocument();
    expect(within(reasons).getByText(/Mijoz ilovadan o'zi bekor qilgani/)).toHaveTextContent(
      "17 ta (xodimlar bilan muammo 9 · mahsulot bilan 8)",
    );

    expect(await within(card("Kim va qanday tasdiqladi")).findByText("Ilovada surish")).toBeInTheDocument();

    const durations = card("Bosqich vaqtlari");
    expect(await within(durations).findByText("Tasdiq → Jo'natish")).toBeInTheDocument();
    expect(within(durations).getByText("maqsaddan sekin")).toBeInTheDocument();
    expect(within(durations).getAllByText("maqsadda")).toHaveLength(2);

    expect(
      await within(card("Qachon buyurtma ko'p")).findAllByRole("button", { name: /^Juma 10:00–12:00: / }),
    ).toHaveLength(1);
  });

  it("lists stuck orders oldest first with the total past their rule", async () => {
    await renderWithProviders(<OrdersScreen />);

    const stuck = card("Qotib qolgan buyurtmalar");
    const rows = await within(stuck).findAllByRole("button", { name: /buyurtmasini ochish$/ });

    expect(within(stuck).getByText("48 ta")).toBeInTheDocument();
    // jadval qatorlari birinchi, telefon kartalari keyin — har ko'rinishda 5 tadan
    expect(rows.slice(0, 5).map((row) => row.getAttribute("aria-label"))).toEqual(
      ["DA-183712", "DA-183802", "DA-183688", "DA-183940", "DA-183955"].map(
        (number) => `${number} buyurtmasini ochish`,
      ),
    );
    expect(within(stuck).getAllByText("kuryersiz").length).toBeGreaterThan(0);
  });

  it("keeps the rest of the page working when one block fails", async () => {
    failNext("orders/heatmap/");
    await renderWithProviders(<OrdersScreen />);

    expect(
      await within(card("Qachon buyurtma ko'p")).findByRole("button", { name: "Qayta urinish" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Jami buyurtma")).toBeInTheDocument();
    expect(await within(card("Manba")).findByText("Operator (CRM)")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Qayta urinish" })).toHaveLength(1);
  });

  it("filters recent orders by status on the server", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<OrdersScreen />);
    const recent = card("So'nggi buyurtmalar");
    await orderRow(recent, "DA-184032");

    await user.click(within(recent).getByRole("button", { name: "Atkaz", pressed: false }));

    await orderRow(recent, "DA-184022");
    expect(within(recent).getByRole("button", { name: "Atkaz", pressed: true })).toBeInTheDocument();
    await expect.poll(() => queryOrderRows(recent, "DA-184032")).toHaveLength(0);
  });

  it("offers to clear the filters when nothing matches", async () => {
    const user = userEvent.setup();
    // Samarqand filialida atkaz qilingan buyurtma yo'q
    await renderWithProviders(<OrdersScreen />, { searchParams: "?filial=3" });
    const recent = card("So'nggi buyurtmalar");
    await orderRow(recent, "DA-184032");

    await user.click(within(recent).getByRole("button", { name: "Atkaz", pressed: false }));
    expect(await within(recent).findByText("Hech narsa topilmadi")).toBeInTheDocument();

    await user.click(within(recent).getByRole("button", { name: "Filtrlarni tozalash" }));

    await orderRow(recent, "DA-184032");
    expect(within(recent).getByRole("button", { name: "Barchasi", pressed: true })).toBeInTheDocument();
  });

  it("opens with the search from the URL and says what was not found", async () => {
    await renderWithProviders(<OrdersScreen />, { searchParams: "?q=DA-999999" });
    const recent = card("So'nggi buyurtmalar");

    expect(await within(recent).findByText("«DA-999999» topilmadi")).toBeInTheDocument();
    expect(within(recent).getByRole("searchbox", { name: "Buyurtmalardan qidirish" })).toHaveValue(
      "DA-999999",
    );
  });

  it("opens the order card when a row is clicked", async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <>
        <OrdersScreen />
        <OrderDrawer />
      </>,
    );

    await user.click(await orderRow(card("So'nggi buyurtmalar"), "DA-184029"));

    const drawer = await screen.findByRole("dialog");
    expect(await within(drawer).findByRole("heading", { name: "DA-184029" })).toBeInTheDocument();
    expect(within(drawer).getByText("Rustam Qodirov")).toBeInTheDocument();
    expect(within(drawer).getByText("+998 91 345 67 89")).toBeInTheDocument();
    expect(within(drawer).getByText("Yetkazilganda to'lanadi")).toBeInTheDocument();
    expect(within(drawer).getByText("Sovg'a: Krem namunasi × 1")).toBeInTheDocument();
    expect(within(drawer).getByText("Bobur Rahimov")).toBeInTheDocument();
    expect(within(drawer).getByText("Yo'lga chiqarildi")).toBeInTheDocument();
    expect(
      within(drawer).getByText("Boshliq paneli faqat ko'rish uchun — tahrirlash CRM / logist panelida."),
    ).toBeInTheDocument();
  });
});

describe("OrderDrawer", () => {
  useMockApi();

  it("stays closed until an order is requested", async () => {
    await renderWithProviders(<OrderDrawer />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explains a pending order and shows its timeline newest first", async () => {
    await renderWithProviders(<OrderDrawer />, {
      searchParams: "?order=9f1c0001-0000-4000-8000-000000183688",
    });

    const drawer = await screen.findByRole("dialog");
    expect(await within(drawer).findByText("Mijoz tasdig'i kutilmoqda")).toBeInTheDocument();
    expect(within(drawer).getByText("Tanlanmagan")).toBeInTheDocument();
    expect(
      within(drawer)
        .getAllByRole("listitem")
        .map((item) => item.querySelector("p")?.textContent),
    ).toEqual(["Mijozga bildirishnoma yuborildi", "Buyurtma yaratildi"]);
  });

  it("says so when the order does not exist", async () => {
    await renderWithProviders(<OrderDrawer />, {
      searchParams: "?order=00000000-0000-4000-8000-000000000000",
    });

    expect(await screen.findByText("Buyurtma topilmadi")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Qayta urinish" })).not.toBeInTheDocument();
  });

  it("offers a retry when the order fails to load", async () => {
    failNext("orders/9f1c0001-0000-4000-8000-000000184029/");
    await renderWithProviders(<OrderDrawer />, {
      searchParams: "?order=9f1c0001-0000-4000-8000-000000184029",
    });

    expect(await screen.findByRole("button", { name: "Qayta urinish" })).toBeInTheDocument();
  });
});
