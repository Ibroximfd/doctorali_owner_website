// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetSklad } from "@/shared/testing/fixtures/sklad-state";
import { resetStructure } from "@/shared/testing/fixtures/structure-v2";
import { mockGet } from "@/shared/testing/mock-api";
import { renderWithProviders } from "@/shared/testing/render";
import { server, useMockApi } from "@/shared/testing/server";

import { WarehouseScreen } from "./warehouse-screen";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const card = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`"${title}" kartasi yo'q`);
  return section;
};

describe("WarehouseScreen", () => {
  useMockApi();
  afterEach(() => {
    resetStructure();
    resetSklad();
    vi.clearAllMocks();
  });

  it("colours regions by sklad and shows the sklad and its chief courier on hover", async () => {
    await renderWithProviders(<WarehouseScreen />, { searchParams: "?period=30d" });

    const map = within(card("Skladlar xaritasi"));
    const namangan = await map.findByRole("button", { name: /^Namangan: Vodiy sklad/ });
    fireEvent.pointerEnter(namangan);
    expect(await map.findAllByText("Akmal Tursunov")).not.toHaveLength(0);
  });

  it("is read-only: no receipt, write-off, adjustment or region editing", async () => {
    await renderWithProviders(<WarehouseScreen />, { searchParams: "?period=30d" });

    const stock = within(card("Qoldiq"));
    expect(await stock.findByRole("button", { name: "Janub sklad" })).toBeInTheDocument();
    for (const name of ["Kirim", "Chiqim", "Tuzatish"])
      expect(stock.queryByRole("button", { name })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /viloyatlarni o'zgartirish/ })).not.toBeInTheDocument();
  });

  it("narrows stock to one sklad and marks low items", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<WarehouseScreen />, { searchParams: "?period=30d" });

    const stock = within(card("Qoldiq"));
    await user.click(await stock.findByRole("button", { name: "Janub sklad" }));
    expect(stock.getByRole("button", { name: "Janub sklad" })).toHaveAttribute("aria-pressed", "true");
    expect(stock.getAllByText("Kam").length).toBeGreaterThan(0);
  });

  it("filters the history by type and opens a movement's document", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<WarehouseScreen />, { searchParams: "?period=30d" });

    const history = within(card("Harakatlar tarixi"));
    await user.selectOptions(await history.findByLabelText("Tur"), "receipt");
    const [row] = await history.findAllByRole("button", { name: /^Kirim, / });
    if (!row) throw new Error("qator yo'q");
    await user.click(row);
    const drawer = await screen.findByRole("dialog");
    expect(await within(drawer).findByText(/^Hujjat KIR-/)).toBeInTheDocument();
    expect(within(drawer).getByText("Ishlab chiqarish")).toBeInTheDocument();
  });

  it("lists unassigned products first and gives one to a filial without a confirm", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<WarehouseScreen />, { searchParams: "?period=30d" });

    const grants = within(card("Mahsulot dopuski"));
    const unassigned = await grants.findByRole("region", { name: /Hech bir filialga berilmagan/ });
    expect(within(unassigned).getByText("Prostavit")).toBeInTheDocument();
    expect(grants.getByText(/hamma logisti skladda boshqaradi/)).toBeInTheDocument();

    await user.selectOptions(grants.getByLabelText("Prostavit: qaysi filialga berilgan"), "Toshkent 1");
    await vi.waitFor(() => {
      const saved = mockGet("structure/sklad-grants/2/") as { items: { product_id: number }[] };
      expect(saved.items.map((item) => item.product_id)).toContain(18);
    });
  });

  it("moves a product between filials only after a confirm", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<WarehouseScreen />, { searchParams: "?period=30d" });

    const grants = within(card("Mahsulot dopuski"));
    await user.selectOptions(await grants.findByLabelText("Neyrovit: qaysi filialga berilgan"), "Toshkent 1");
    const confirm = await screen.findByRole("dialog", { name: "«Neyrovit» boshqa filialga o'tkazilsinmi?" });
    await user.click(within(confirm).getByRole("button", { name: "Olib, berish" }));

    await vi.waitFor(() => {
      const from = mockGet("structure/sklad-grants/3/") as { items: { product_id: number }[] };
      const to = mockGet("structure/sklad-grants/2/") as { items: { product_id: number }[] };
      expect(from.items.map((item) => item.product_id)).not.toContain(17);
      expect(to.items.map((item) => item.product_id)).toContain(17);
    });
  });

  it("names the holder on grant_conflict and offers to take it from there", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<WarehouseScreen />, { searchParams: "?period=30d" });
    server.use(
      http.put(
        "*/api/owner/structure/sklad-grants/:id/",
        () =>
          HttpResponse.json({ code: "grant_conflict", detail: "x", fields: { filial: 1 } }, { status: 409 }),
        { once: true },
      ),
    );

    const grants = within(card("Mahsulot dopuski"));
    await user.selectOptions(
      await grants.findByLabelText("Prostavit: qaysi filialga berilgan"),
      "Toshkent 1",
    );
    const conflict = await screen.findByRole("dialog", { name: "«Prostavit» allaqachon Qo'qon filialida" });
    await user.click(within(conflict).getByRole("button", { name: "Olib, berish" }));
    await vi.waitFor(() => {
      const saved = mockGet("structure/sklad-grants/2/") as { items: { product_id: number }[] };
      expect(saved.items.map((item) => item.product_id)).toContain(18);
    });
  });
});
