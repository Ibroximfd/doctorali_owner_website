// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { failNext, useMockApi } from "@/shared/testing/server";

import { SalesScreen } from "./sales-screen";

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

const operatorsTable = (): Promise<HTMLElement> => within(cardOf("Operatorlar reytingi")).findByRole("table");

const FILIALS_CARD = "Filiallar — operator jamoalari";
const filialsTable = (): Promise<HTMLElement> => within(cardOf(FILIALS_CARD)).findByRole("table");
const filialRow = async (name: RegExp): Promise<HTMLElement> =>
  within(await filialsTable()).findByRole("button", { name });

describe("SalesScreen", () => {
  useMockApi();

  it("shows the KPI row with current-state numbers that carry no comparison", async () => {
    await renderWithProviders(<SalesScreen />, { searchParams: "?period=30d" });

    await screen.findByText("Yangi lidlar");
    expect(within(tileOf("Yangi lidlar")).getByText("6 240")).toBeInTheDocument();
    // operatorlar sotuvi = jadvaldagi sakkiz operator yig'indisi
    expect(within(tileOf("Operatorlar sotuvi")).getByText("1,18 mlrd")).toBeInTheDocument();
    expect(screen.getByText("14 820")).toBeInTheDocument();

    const missed = within(tileOf("O'tkazib yuborilgan (ochiq)"));
    expect(missed.getByText("31")).toBeInTheDocument();
    expect(missed.getByText("hozir · qayta qo'ng'iroq kerak")).toBeInTheDocument();
    expect(missed.queryByText(/o'sdi|kamaydi/)).not.toBeInTheDocument();

    const overdue = within(tileOf("Muddati o'tgan dela"));
    expect(overdue.getByText("46")).toBeInTheDocument();
    expect(overdue.getByText("hozir")).toBeInTheDocument();
  });

  it("ranks operators by sales and flags the ones falling behind", async () => {
    await renderWithProviders(<SalesScreen />, { searchParams: "?period=30d" });

    const rows = await within(await operatorsTable()).findAllByRole("button");

    expect(rows).toHaveLength(8);
    expect(rows[0]).toHaveAccessibleName("Muhammadjon Xaydarov — operator kartasini ochish");
    expect(within(rows[0] as HTMLElement).getByText("205 mln")).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText("Toshkent · Onlayn")).toBeInTheDocument();
    // eng oxirgi o'rin: 9 ta hal qilinmagan qo'ng'iroq, 14 ta dela, bahosi 4 dan past
    const last = within(rows[7] as HTMLElement);
    expect(last.getByText("Bekzod Olimov")).toBeInTheDocument();
    expect(last.getByText("Toshkent · Oflayn")).toBeInTheDocument();
    expect(last.getByText("3,9")).toBeInTheDocument();
  });

  it("shows only the selected filial's operators", async () => {
    await renderWithProviders(<SalesScreen />, { searchParams: "?period=30d&filial=3" });

    const table = within(await operatorsTable());

    expect(table.getAllByRole("button")).toHaveLength(2);
    expect(table.getByText("Jahongir Tursunov")).toBeInTheDocument();
    expect(table.queryByText("Muhammadjon Xaydarov")).not.toBeInTheDocument();
  });

  it("compares the filial teams side by side and flags the one falling behind", async () => {
    await renderWithProviders(<SalesScreen />, { searchParams: "?period=30d" });

    const rows = await within(await filialsTable()).findAllByRole("button");

    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
      "Toshkent filialini tanlash",
      "Qo'qon filialini tanlash",
      "Samarqand filialini tanlash",
    ]);
    const tashkent = within(rows[0] as HTMLElement);
    expect(tashkent.getByText("Rahbar: Rustam Abdullayev")).toBeInTheDocument();
    expect(tashkent.getByText("4 operator · 3 onlayn")).toBeInTheDocument();
    expect(tashkent.getByText("648 mln")).toBeInTheDocument();
    expect(tashkent.getByText("162 mln")).toBeInTheDocument();
    expect(tashkent.getByText("o'rtachadan 10% yuqori")).toBeInTheDocument();
    // Samarqand: bir operatorga sotuv kompaniya o'rtachasidan 17% past
    const samarkand = within(rows[2] as HTMLElement);
    expect(samarkand.getByText("o'rtachadan 17% past")).toBeInTheDocument();
    expect(samarkand.getByText("122 mln")).toBeInTheDocument();
    expect(samarkand.getByRole("meter", { name: /^Samarqand: oy rejasi/ })).toBeInTheDocument();
    // hech biri tanlanmagan — "Barcha filiallar" tugmasi ham yo'q
    expect(rows.every((row) => row.getAttribute("aria-pressed") === "false")).toBe(true);
    expect(within(cardOf(FILIALS_CARD)).queryByRole("button", { name: "Barcha filiallar" })).toBeNull();
  });

  it("shows each filial's share and its own trend line", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SalesScreen />, { searchParams: "?period=7d" });

    const share = within(cardOf("Sotuvdagi ulush"));
    const items = await share.findAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0] as HTMLElement).getByText("Toshkent")).toBeInTheDocument();
    expect(within(items[0] as HTMLElement).getByText("151 mln")).toBeInTheDocument();
    expect(within(items[0] as HTMLElement).getByText("55,0%")).toBeInTheDocument();

    // grafikning jadval ko'rinishi: har filial — alohida ustun
    await screen.findByRole("heading", { name: "Filiallar sotuvi dinamikasi" });
    const trend = within(cardOf("Filiallar sotuvi dinamikasi"));
    await user.click(await trend.findByRole("button", { name: "Jadval" }));
    const table = within(trend.getByRole("table"));
    expect(table.getByRole("columnheader", { name: "Toshkent" })).toBeInTheDocument();
    expect(table.getByRole("columnheader", { name: "Qo'qon" })).toBeInTheDocument();
    expect(table.getByRole("columnheader", { name: "Samarqand" })).toBeInTheDocument();
  });

  it("keeps every filial listed when one is selected and marks the selected one", async () => {
    await renderWithProviders(<SalesScreen />, { searchParams: "?period=30d&filial=3" });

    const rows = await within(await filialsTable()).findAllByRole("button");

    expect(rows).toHaveLength(3);
    expect(rows[2]).toHaveAccessibleName("Samarqand — tanlangan; filtrni olib tashlash");
    expect(rows[2]).toHaveAttribute("aria-pressed", "true");
    expect(within(rows[2] as HTMLElement).getByText("Tanlangan")).toBeInTheDocument();
    expect(rows[0]).toHaveAttribute("aria-pressed", "false");
    expect(
      within(cardOf(FILIALS_CARD)).getByRole("button", { name: "Barcha filiallar" }),
    ).toBeInTheDocument();
  });

  it("focuses the whole page on a filial from its row and back again", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SalesScreen />, { searchParams: "?period=30d" });
    await waitFor(async () => expect(within(await operatorsTable()).getAllByRole("button")).toHaveLength(8));

    await user.click(await filialRow(/^Samarqand filialini tanlash$/));

    await waitFor(async () => expect(within(await operatorsTable()).getAllByRole("button")).toHaveLength(2));
    expect(within(await operatorsTable()).getByText("Jahongir Tursunov")).toBeInTheDocument();
    expect(await filialRow(/^Samarqand — tanlangan/)).toHaveAttribute("aria-pressed", "true");
    // filiallar ro'yxati to'liq qoladi — boshqasiga bir bosishda o'tiladi
    expect(within(await filialsTable()).getAllByRole("button")).toHaveLength(3);

    await user.click(await filialRow(/^Qo'qon filialini tanlash$/));

    await waitFor(async () =>
      expect(within(await operatorsTable()).queryByText("Jahongir Tursunov")).not.toBeInTheDocument(),
    );
    expect(await filialRow(/^Qo'qon — tanlangan/)).toHaveAttribute("aria-pressed", "true");
    expect(await filialRow(/^Samarqand filialini tanlash$/)).toHaveAttribute("aria-pressed", "false");

    await user.click(within(cardOf(FILIALS_CARD)).getByRole("button", { name: "Barcha filiallar" }));

    await waitFor(async () => expect(within(await operatorsTable()).getAllByRole("button")).toHaveLength(8));
    expect(within(cardOf(FILIALS_CARD)).queryByRole("button", { name: "Barcha filiallar" })).toBeNull();
  });

  it("clears the focus when the selected filial row is pressed again", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SalesScreen />, { searchParams: "?period=30d&filial=3" });

    await user.click(await filialRow(/^Samarqand — tanlangan/));

    await waitFor(async () => expect(within(await operatorsTable()).getAllByRole("button")).toHaveLength(8));
    expect(await filialRow(/^Samarqand filialini tanlash$/)).toHaveAttribute("aria-pressed", "false");
  });

  it("offers a retry inside the filial table when it fails, leaving operators intact", async () => {
    failNext("sales/filials/");
    await renderWithProviders(<SalesScreen />, { searchParams: "?period=30d" });

    expect(
      await within(cardOf(FILIALS_CARD)).findByRole("button", { name: "Qayta urinish" }),
    ).toBeInTheDocument();
    expect(await within(await operatorsTable()).findAllByRole("button")).toHaveLength(8);
  });

  it("shows the lead funnel, sources, ratings, calls and unhandled missed calls", async () => {
    await renderWithProviders(<SalesScreen />, { searchParams: "?period=30d" });

    const funnel = within(cardOf("Lidlar voronkasi"));
    expect(await funnel.findByText("Buyurtma yaratildi")).toBeInTheDocument();
    expect(funnel.getByText("31,0%")).toBeInTheDocument();

    const sources = within(cardOf("Lid manbalari"));
    expect(await sources.findByText("Kiruvchi qo'ng'iroq")).toBeInTheDocument();
    expect(sources.getByText("52,0%")).toBeInTheDocument();

    const ratings = within(cardOf("Mutaxassis baholari"));
    expect(await ratings.findByText("4,6")).toBeInTheDocument();
    expect(ratings.getByText("1 284 ta baho · mijozlar ilovada qo'ygan")).toBeInTheDocument();
    expect(ratings.getByText("Uzoq kutdim, qayta qo'ng'iroq qilishmadi")).toBeInTheDocument();
    expect(ratings.getByText("Bekzod Olimov · mijoz: Anvar Sobirov ·")).toBeInTheDocument();

    // javob ulushi ma'lumot kelgach chiqadi — karta shundan keyin qidiriladi (yuklanish kartasi almashadi)
    await screen.findByText("87,5%");
    const calls = within(cardOf("Qo'ng'iroqlar"));
    expect(calls.getByText("2 daq 22 s")).toBeInTheDocument();
    expect(calls.getByText("1 856")).toBeInTheDocument();
    expect(await calls.findByText("31 tasi hal qilinmagan")).toBeInTheDocument();

    const missed = within(cardOf("Hal qilinmagan o'tkazib yuborilganlar"));
    const names = (await missed.findAllByRole("listitem")).map((item) => item.textContent);
    expect(names).toHaveLength(7);
    expect(names[0]).toContain("Bekzod Olimov");
  });

  it("keeps the rest of the page working when one block fails", async () => {
    failNext("sales/ratings/");
    await renderWithProviders(<SalesScreen />, { searchParams: "?period=30d" });

    expect(await screen.findByText("6 240")).toBeInTheDocument();
    expect(await within(cardOf("Lidlar voronkasi")).findByText("Aloqada")).toBeInTheDocument();
    expect(
      await within(cardOf("Mutaxassis baholari")).findByRole("button", { name: "Qayta urinish" }),
    ).toBeInTheDocument();
  });

  it("opens the operator card from a table row and closes it again", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SalesScreen />, { searchParams: "?period=30d" });

    const table = within(await operatorsTable());
    await user.click(table.getByRole("button", { name: "Bekzod Olimov — operator kartasini ochish" }));

    // dialog nomi — operator ismi (yuklanguncha umumiy "Operator")
    const drawer = within(await screen.findByRole("dialog", { name: "Bekzod Olimov" }));
    expect(drawer.getByText("Operator · Toshkent")).toBeInTheDocument();
    expect(drawer.getByText("Ish ko'rsatkichlari")).toBeInTheDocument();
    expect(drawer.getByText("O'tkazib yuborilgan qo'ng'iroqlar (hal qilinmagan)")).toBeInTheDocument();
    expect(drawer.getByText("Oflayn")).toBeInTheDocument();
    expect(drawer.getByRole("heading", { name: "Kunlik dinamika" })).toBeInTheDocument();

    await user.click(drawer.getByRole("button", { name: "Yopish" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the operator card straight from the link", async () => {
    await renderWithProviders(<SalesScreen />, { searchParams: "?period=30d&operator=7" });

    expect(await screen.findByRole("heading", { name: "Muhammadjon Xaydarov" })).toBeInTheDocument();
  });

  it("offers a retry inside the card when the operator does not exist", async () => {
    await renderWithProviders(<SalesScreen />, { searchParams: "?period=30d&operator=999" });

    const drawer = within(await screen.findByRole("dialog"));
    expect(await drawer.findByText("So'ralgan ma'lumot topilmadi.")).toBeInTheDocument();
    expect(drawer.getByRole("button", { name: "Qayta urinish" })).toBeInTheDocument();
  });
});
