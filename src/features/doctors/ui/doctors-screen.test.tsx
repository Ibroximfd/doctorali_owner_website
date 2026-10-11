// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { failNext, useMockApi } from "@/shared/testing/server";

import { DoctorsScreen } from "./doctors-screen";

/** Reyting kartasi — sarlavhasi (`h2`) bo'yicha topiladi. */
const rankingCard = (): HTMLElement => {
  const section = screen.getByRole("heading", { name: "Shifokorlar reytingi" }).closest("section");
  if (!section) throw new Error("reyting kartasi topilmadi");
  return section;
};

/** Xato holati `ky` ning bitta qayta urinishidan keyin chiqadi — odatdagi 1 soniyadan ko'proq kutamiz. */
const AFTER_RETRY = { timeout: 4000 };

describe("DoctorsScreen", () => {
  useMockApi();

  it("shows the four KPIs", async () => {
    await renderWithProviders(<DoctorsScreen />);

    expect(await screen.findByText("Faol shifokorlar")).toBeInTheDocument();
    expect(screen.getByText("46")).toBeInTheDocument();
    expect(screen.getByText("davrda kamida 1 qabul")).toBeInTheDocument();
    expect(screen.getByText("968")).toBeInTheDocument();
    expect(screen.getByText("236 mln")).toBeInTheDocument();
    expect(screen.getByText("21,4 mln")).toBeInTheDocument();
    expect(screen.getByText("11 shifokorga · hozir")).toBeInTheDocument();
  });

  it("ranks doctors by sales with commission, outstanding payout and rating", async () => {
    await renderWithProviders(<DoctorsScreen />);

    // jadval va telefon kartalari bir vaqtda DOM da — birinchi yarmi jadval qatorlari
    const ranking = rankingCard();
    const names = (
      await within(ranking).findAllByText(/^(Ali Valiyev|Nodira Sultonova|Kamola Yusupova)$/)
    ).map((node) => node.textContent);
    expect(names.slice(0, 3)).toEqual(["Ali Valiyev", "Nodira Sultonova", "Kamola Yusupova"]);

    expect(within(ranking).getAllByText("Terapevt · Toshkent")).toHaveLength(2);
    expect(within(ranking).getAllByText("58,7 mln")).toHaveLength(2);
    expect(within(ranking).getAllByText("(182)")).toHaveLength(2);
    // to'lanmagan qoldig'i yo'q shifokor — "0"
    expect(within(ranking).getAllByText("0")).toHaveLength(2);
  });

  it("keeps the ranking working when the summary fails", async () => {
    failNext("doctors/summary/");
    await renderWithProviders(<DoctorsScreen />);

    expect(await within(rankingCard()).findAllByText("Ali Valiyev")).toHaveLength(2);
    expect(await screen.findByRole("button", { name: "Qayta urinish" }, AFTER_RETRY)).toBeInTheDocument();
    expect(screen.queryByText("Faol shifokorlar")).not.toBeInTheDocument();
  });

  it("says there is nothing to show for a filial without doctors", async () => {
    await renderWithProviders(<DoctorsScreen />, { searchParams: "?filial=3" });

    expect(await within(rankingCard()).findByText("Bu davrda ma'lumot yo'q")).toBeInTheDocument();
    expect(await screen.findByText("Faol shifokorlar")).toBeInTheDocument();
  });
});
