// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { OverviewScreen } from "./overview-screen";

describe("OverviewScreen", () => {
  useMockApi();

  it("shows money and where it is, the four order states, conversion and filials at a glance", async () => {
    await renderWithProviders(<OverviewScreen dateline="bugun" aiSlot={<p>AI xulosasi</p>} />, {
      searchParams: "?period=30d",
    });

    expect(screen.getByRole("heading", { level: 1, name: "Umumiy holat" })).toBeInTheDocument();
    expect(await screen.findByText("Pul hozir qayerda")).toBeInTheDocument();
    expect(screen.getAllByText("Bosh kuryerlarda").length).toBeGreaterThan(0);
    for (const label of ["Sotildi", "Yo'lda", "Yetkazildi", "Atkaz", "Konversiya"])
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);

    const filials = screen.getByRole("heading", { name: "Filiallar taqqoslanishi" }).closest("section");
    if (!filials) throw new Error("filiallar kartasi yo'q");
    expect((await within(filials).findAllByText("Toshkent 2")).length).toBeGreaterThan(0);
    expect(within(filials).getAllByText("Konversiya eng past").length).toBeGreaterThan(0);
    expect(screen.getByText("AI xulosasi")).toBeInTheDocument();
  });
});
