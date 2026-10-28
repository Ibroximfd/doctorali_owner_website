// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { failNext, useMockApi } from "@/shared/testing/server";

import { OverviewScreen } from "./overview-screen";

describe("OverviewScreen", () => {
  useMockApi();

  it("shows the headline revenue, KPIs, pipeline, branches and the money position", async () => {
    await renderWithProviders(<OverviewScreen />, { searchParams: "?period=30d" });

    // jami tushum = kanallar yig'indisi (1 782 + 486 + 64 mln) — hero va filiallar jadvalining "Jami"
    // qatorida (jadvalda ham, telefon kartalarida ham)
    expect(await screen.findAllByText("2,33 mlrd")).toHaveLength(3);
    // kanal nomi hero tarkibida ham, trend grafigi legendida ham bor
    expect(screen.getAllByText("Onlayn konsultatsiya").length).toBeGreaterThan(0);

    expect(screen.getByText("Yetkazish ulushi")).toBeInTheDocument();
    // KPI da va filiallar "Jami" qatorida (jadval va telefon kartasi)
    expect(screen.getAllByText("85,7%")).toHaveLength(3);

    const pipeline = screen.getByText("Buyurtma oqimi — hozir").closest("section");
    expect(within(pipeline as HTMLElement).getByText("18 tasi kuryersiz (3 s+)")).toBeInTheDocument();

    expect(screen.getByText("Filiallar taqqoslash")).toBeInTheDocument();
    expect(screen.getAllByText("Samarqand").length).toBeGreaterThan(0);
    expect(screen.getByText("Kuryerlarda (topshirilmagan)")).toBeInTheDocument();
  });

  it("lists the most important open alerts with a link to all of them", async () => {
    await renderWithProviders(<OverviewScreen />);

    expect(await screen.findByText("Kuryerda naqd 2 kundan beri topshirilmagan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Barchasi/ })).toHaveAttribute("href", "/alerts");
  });

  it("keeps the rest of the page working when one block fails", async () => {
    failNext("feed/");
    await renderWithProviders(<OverviewScreen />);

    expect((await screen.findAllByText("2,33 mlrd")).length).toBeGreaterThan(0);
    // lenta bloki o'z xatosini ko'rsatadi, qayta urinish bilan
    const feed = screen.getByRole("heading", { name: "Hozir" }).closest("section");
    expect(
      await within(feed as HTMLElement).findByRole("button", { name: "Qayta urinish" }),
    ).toBeInTheDocument();
  });

  it("hides comparison deltas when the owner turns comparison off", async () => {
    await renderWithProviders(<OverviewScreen />, { searchParams: "?compare=none" });

    await screen.findAllByText("2,33 mlrd");
    expect(screen.getByText("yetkazilgan buyurtmalar + klinika + konsultatsiya")).toBeInTheDocument();
    expect(screen.queryByText(/o'sdi/)).not.toBeInTheDocument();
  });
});
