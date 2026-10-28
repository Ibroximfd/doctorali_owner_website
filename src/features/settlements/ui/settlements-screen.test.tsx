// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { failNext, useMockApi } from "@/shared/testing/server";

import { SettlementsScreen } from "./settlements-screen";

const card = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`"${title}" kartasi topilmadi`);
  return section;
};

const AFTER_RETRY = { timeout: 4000 };

describe("SettlementsScreen", () => {
  useMockApi();

  it("shows the hero and receivable KPIs", async () => {
    await renderWithProviders(<SettlementsScreen />);
    expect(screen.getByRole("heading", { level: 1, name: "Hisob-kitob" })).toBeInTheDocument();
    expect(await screen.findByText("30 kundan oshgan")).toBeInTheDocument();
    expect(screen.getAllByText("Olinishi kerak").length).toBeGreaterThan(0);
  });

  it("lists regions with debtors first and pharmacies", async () => {
    await renderWithProviders(<SettlementsScreen />);
    const regions = card("Hududlar bo'yicha");
    expect(await within(regions).findAllByText("Kechikkan")).not.toHaveLength(0);
    const b2b = card("Dorixonalar (B2B)");
    expect(await within(b2b).findAllByText("Shifo Farm")).not.toHaveLength(0);
    expect(within(card("Qarz muddatlari")).getByText("60 kundan ortiq")).toBeInTheDocument();
  });

  it("keeps the page alive when one block fails", async () => {
    failNext("settlements/b2b/");
    await renderWithProviders(<SettlementsScreen />);
    expect(await screen.findByText("30 kundan oshgan")).toBeInTheDocument();
    expect(
      await within(card("Dorixonalar (B2B)")).findByRole("button", { name: /qayta/i }, AFTER_RETRY),
    ).toBeInTheDocument();
  });
});
