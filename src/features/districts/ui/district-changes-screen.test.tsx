// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { failNext, server, useMockApi } from "@/shared/testing/server";

import { DistrictChangesScreen } from "./district-changes-screen";

const PATH = "logistics/district-changes/";

describe("DistrictChangesScreen", () => {
  useMockApi();

  it("lists changes with action labels, badges, name change and actor", async () => {
    await renderWithProviders(<DistrictChangesScreen />);

    expect((await screen.findAllByText("Nomi o'zgardi")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Qo'shildi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("qo'lda qo'shilgan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("yashirin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Qo'qon shahri").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bosh kuryer Farg'ona").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Noma'lum/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 ta maydon").length).toBeGreaterThan(0);
  });

  it("filters by district from the table and shows no-results for an empty range", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DistrictChangesScreen />);

    const [urgut] = await screen.findAllByRole("button", { name: "Urgut tumani bo'yicha saralash" });
    if (!urgut) throw new Error("Urgut tugmasi yo'q");
    await user.click(urgut);
    expect(await screen.findByRole("button", { name: "Tuman filtrini olib tashlash" })).toHaveTextContent(
      "Tuman: Urgut",
    );
    expect(screen.queryAllByText("Qo'qon shahri")).toHaveLength(0);
  });

  it("shows no-results with a clear action when filters match nothing", async () => {
    await renderWithProviders(<DistrictChangesScreen />, { searchParams: "?from=2026-12-01" });

    expect(await screen.findByRole("button", { name: "Filtrlarni tozalash" })).toBeInTheDocument();
  });

  it("explains an empty journal and when it started", async () => {
    server.use(
      http.get(`*/api/owner/${PATH}`, () =>
        HttpResponse.json({ count: 0, page: 1, page_size: 50, results: [] }),
      ),
    );
    await renderWithProviders(<DistrictChangesScreen />);

    expect(await screen.findByText("Hali o'zgarish yo'q")).toBeInTheDocument();
    expect(screen.getByText(/undan oldingi o'zgarishlar yozilmagan/)).toBeInTheDocument();
  });

  it("shows the no-access state for section_forbidden", async () => {
    failNext(PATH, 403, "section_forbidden");
    await renderWithProviders(<DistrictChangesScreen />);

    expect(await screen.findByText("Bu bo'lim sizga ochilmagan")).toBeInTheDocument();
  });

  it("offers a retry on a server error", async () => {
    failNext(PATH, 500);
    await renderWithProviders(<DistrictChangesScreen />);

    const search = screen.getByRole("search", { name: "Tumanlar tarixi filtrlari" });
    expect(within(search).getByLabelText("Viloyat")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Qayta urinish/ })).toBeInTheDocument();
  });
});
