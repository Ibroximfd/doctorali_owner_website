// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { ForecastScreen } from "./forecast-screen";

const card = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`"${title}" kartasi topilmadi`);
  return section;
};

describe("ForecastScreen", () => {
  useMockApi();

  it("shows expected revenue with its range and the stockouts", async () => {
    await renderWithProviders(<ForecastScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "Prognoz" })).toBeInTheDocument();
    expect(await screen.findByText("Kutilgan pul kirimi")).toBeInTheDocument();
    expect(await within(card("Tugaydigan mahsulotlar")).findAllByText("Mehrigiyo balzami")).not.toHaveLength(
      0,
    );
    expect(within(card("Hududlar prognozi")).getByText("Toshkent shahri")).toBeInTheDocument();
  });

  it("draws the fan chart with today, the 80%/50% cone and annotation tiles", async () => {
    await renderWithProviders(<ForecastScreen />);

    const chart = await screen.findByRole("img", { name: "Kunlik tushum" });
    expect(chart.querySelectorAll("path").length).toBeGreaterThanOrEqual(4);
    expect(within(card("Kunlik tushum")).getByText("Bugun")).toBeInTheDocument();
    expect(within(card("Kunlik tushum")).getByText(/, kutilgan$/)).toBeInTheDocument();
    expect(within(card("Kunlik tushum")).getByText("50% oraliq")).toBeInTheDocument();
    expect(await screen.findByText("Eng yaqin tugash")).toBeInTheDocument();
  });

  it("switches the horizon", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<ForecastScreen />);
    await screen.findByText("Kutilgan pul kirimi");

    await user.click(screen.getByRole("button", { name: "7 kun" }));
    expect(screen.getByRole("button", { name: "7 kun" })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("7 kunlik tushum")).toBeInTheDocument();
  });
});
