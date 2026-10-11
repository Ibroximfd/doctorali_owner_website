// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";

import { ChartCard } from "./chart-card";
import type { ChartData } from "./charts";

const data: ChartData = {
  labels: ["01.10", "02.10"],
  series: [
    { key: "delivery", name: "Yetkazib berish", color: "var(--series-1)", values: [60, 48] },
    { key: "clinic", name: "Klinika", color: "var(--series-2)", values: [17, 12] },
  ],
};

const card = (chart: ChartData) => (
  <ChartCard
    title="Tushum trendi"
    kind="trend"
    data={chart}
    formatValue={(value) => `${value} mln`}
    columnLabel="Davr"
  />
);

describe("ChartCard", () => {
  it("shows a legend for two or more series", async () => {
    await renderWithProviders(card(data));

    expect(screen.getByText("Yetkazib berish")).toBeInTheDocument();
    expect(screen.getByText("Klinika")).toBeInTheDocument();
  });

  it("switches to a table that carries every value without hovering", async () => {
    await renderWithProviders(card(data));

    await userEvent.click(screen.getByRole("button", { name: "Jadval" }));

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Davr" })).toBeInTheDocument();
    expect(within(table).getByText("60 mln")).toBeInTheDocument();
    expect(within(table).getByText("12 mln")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jadval" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the empty state instead of an empty plot", async () => {
    await renderWithProviders(card({ labels: [], series: [] }));

    expect(screen.getByText("Bu davrda ma'lumot yo'q")).toBeInTheDocument();
  });
});
