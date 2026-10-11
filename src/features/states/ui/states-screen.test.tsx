// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";

import { StatesScreen } from "./states-screen";

vi.mock("sonner", () => ({ toast: vi.fn() }));

const cardOf = (title: string) => {
  const card = screen.getByRole("heading", { name: title }).closest("section");
  if (!card) throw new Error(`no card titled "${title}"`);
  return within(card);
};

describe("StatesScreen", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the loading state as skeletons shaped like the KPI row and the chart", async () => {
    const { container } = await renderWithProviders(<StatesScreen />);

    expect(screen.getByRole("heading", { name: "1 · Yuklanmoqda (skeleton)" })).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(2);
  });

  it("shows empty, no-results and error as three different states, each with its next step", async () => {
    await renderWithProviders(<StatesScreen />);

    const empty = cardOf("2 · Bo'sh");
    expect(empty.getByText("Bu davrda buyurtma bo'lmagan")).toBeInTheDocument();
    expect(empty.getByRole("button", { name: "Oxirgi 30 kunni ko'rsatish" })).toBeInTheDocument();

    const noResults = cardOf("3 · Natija yo'q");
    expect(noResults.getByText("«DA-99999» topilmadi")).toBeInTheDocument();
    expect(noResults.getByRole("button", { name: "Filtrlarni tozalash" })).toBeInTheDocument();

    const error = cardOf("4 · Xato");
    expect(error.getByText("Ma'lumotni yuklab bo'lmadi")).toBeInTheDocument();
    expect(error.getByText("Serverda xatolik. Bir ozdan so'ng qayta urinib ko'ring.")).toBeInTheDocument();
    expect(error.getByRole("button", { name: "Qayta urinish" })).toBeInTheDocument();
  });

  it("shows offline as a neutral banner over the cached numbers", async () => {
    await renderWithProviders(<StatesScreen />);
    const offline = cardOf("5 · Oflayn");

    expect(offline.getByRole("status")).toHaveTextContent(
      "Internet yo'q — ko'rsatilayotgan ma'lumot 14:05 dagi holat",
    );
    expect(offline.getByText("131")).toBeInTheDocument();
    expect(offline.getByText("48,1 mln")).toBeInTheDocument();
  });

  it("shows the stale mark and the forbidden explanation", async () => {
    await renderWithProviders(<StatesScreen />);
    const stale = cardOf("6 · Eskirgan va ruxsat yo'q");

    expect(stale.getByRole("status")).toHaveTextContent(
      "Klinika ma'lumoti 18 daqiqa oldin yangilangan — eskirgan",
    );
    expect(stale.getByText("Bu bo'lim sizga ochilmagan")).toBeInTheDocument();
  });

  it("explains what happens on a filter change and links to a page where it can be tried", async () => {
    await renderWithProviders(<StatesScreen />);

    expect(cardOf("Filtr o'zgarganda").getByRole("link", { name: "Umumiy sahifaga" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("tells the owner that gallery buttons are only a demo", async () => {
    await renderWithProviders(<StatesScreen />);

    await userEvent.click(screen.getByRole("button", { name: "Qayta urinish" }));

    expect(toast).toHaveBeenCalledWith("Bu galereya — tugma namuna uchun, hech narsa o'zgarmaydi");
  });
});
