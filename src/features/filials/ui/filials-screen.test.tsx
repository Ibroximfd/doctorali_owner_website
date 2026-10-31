// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetStructure } from "@/shared/testing/fixtures/structure-v2";
import { mockGet } from "@/shared/testing/mock-api";
import { renderWithProviders } from "@/shared/testing/render";
import { server, useMockApi } from "@/shared/testing/server";

import { FilialsScreen } from "./filials-screen";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const cardOf = async (name: string) => {
  const heading = await screen.findByRole("heading", { level: 2, name });
  const card = heading.closest("article");
  if (!card) throw new Error(`${name} kartasi yo'q`);
  return card;
};

type Head = { username: string; permissions: string[] } | null;
const headOf = (name: string, kind: "chief_logist" | "chief_operator"): Head => {
  const data = mockGet("structure/") as { results: ({ name: string } & Record<string, Head | string>)[] };
  return (data.results.find((filial) => filial.name === name)?.[kind] ?? null) as Head;
};

describe("FilialsScreen", () => {
  useMockApi();
  afterEach(() => resetStructure());

  it("shows every filial with its main mark, both heads and the structure history", async () => {
    await renderWithProviders(<FilialsScreen />);

    const main = within(await cardOf("Qo'qon"));
    expect(main.getByText("Asosiy")).toBeInTheDocument();
    expect(main.getByText("Sardor Aliyev")).toBeInTheDocument();
    expect(main.getByText("Malika Yusupova")).toBeInTheDocument();
    expect(await main.findByText("Konversiya")).toBeInTheDocument();
    const history = screen.getByRole("heading", { name: "Tuzilma tarixi" }).closest("section");
    if (!history) throw new Error("tarix kartasi yo'q");
    expect((await within(history).findAllByText("Rahbar tayinlandi")).length).toBeGreaterThan(0);
  });

  it("appoints a new account and shows its password once", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<FilialsScreen />, { searchParams: "?seat=3&role=chief_logist" });

    let sheet = await screen.findByRole("dialog", { name: "Otabek Qodirov" });
    await user.click(within(sheet).getByRole("button", { name: "Olib tashlash" }));
    const confirm = await screen.findByRole("dialog", { name: "Otabek Qodirov rahbarlikdan olinsinmi?" });
    expect(within(confirm).getByText(/Akkaunt va o'rin o'chmaydi/)).toBeInTheDocument();
    await user.click(within(confirm).getByRole("button", { name: "Olib tashlash" }));

    const card = within(await cardOf("Toshkent 2"));
    await user.click(await card.findByRole("button", { name: "Toshkent 2 filialiga Bosh logist tayinlash" }));
    sheet = await screen.findByRole("dialog", { name: "Toshkent 2 — Bosh logist tayinlash" });
    await user.type(within(sheet).getByLabelText("F.I.Sh."), "Olim Karimov");
    await user.type(within(sheet).getByLabelText("Login"), "olim_bl");
    await user.type(within(sheet).getByLabelText("Parol"), "Olim2026x");
    await user.click(await within(sheet).findByRole("switch", { name: /Kassa \(kuryerdan qabul\)/ }));
    await user.click(within(sheet).getByRole("button", { name: "Tayinlash" }));

    const box = await screen.findByRole("region", { name: "Yangi akkaunt paroli" });
    expect(within(box).getByText("Olim2026x")).toBeInTheDocument();
    expect(headOf("Toshkent 2", "chief_logist")).toMatchObject({
      username: "olim_bl",
      permissions: ["cash.accept"],
    });
  });

  it("edits a head's extra permissions in full: role defaults stay locked, clear all works", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<FilialsScreen />, { searchParams: "?leader=2&role=chief_logist" });

    const dialog = await screen.findByRole("dialog", { name: "Toshkent 1 — Bosh logist: dopusklar" });
    expect(await within(dialog).findByText("Rol bilan birga keladi")).toBeInTheDocument();
    // sukut huquq — yoqilgan, lekin o'chirib bo'lmaydi
    const dispatch = await within(dialog).findByRole("switch", { name: /Zakazlarni kuryerlarga taqsimlash/ });
    expect(dispatch).toBeChecked();
    expect(dispatch).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Saqlash" })).toBeDisabled();

    await user.click(within(dialog).getByRole("button", { name: "Hammasini olib tashlash" }));
    expect(within(dialog).getByText(/−\d+ olinadi/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Saqlash" }));

    await vi.waitFor(() => expect(headOf("Toshkent 1", "chief_logist")?.permissions).toEqual([]));
    // kartadagi son darhol yangilanadi
    expect(await screen.findByText(/jahongir_bl · 0 ta qo'shimcha dopusk/)).toBeInTheDocument();
  });

  it("resets a head's password and shows it once", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<FilialsScreen />, { searchParams: "?seat=1&role=chief_operator" });

    const sheet = await screen.findByRole("dialog", { name: "Malika Yusupova" });
    await user.click(within(sheet).getByRole("button", { name: "Parolni tiklash" }));
    const confirm = await screen.findByRole("dialog", { name: "Malika Yusupova paroli tiklansinmi?" });
    await user.click(within(confirm).getByRole("button", { name: "Parolni tiklash" }));
    expect(await screen.findByText("Login: malika_bo")).toBeInTheDocument();
  });

  it("replaces a head atomically with a seat picked from the filial", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<FilialsScreen />, { searchParams: "?seat=2&role=chief_logist" });

    const sheet = await screen.findByRole("dialog", { name: "Jahongir Nazarov" });
    const permissions = headOf("Toshkent 1", "chief_logist")?.permissions;
    await user.click(within(sheet).getByRole("button", { name: "Almashtirish" }));
    await user.click(within(sheet).getByRole("button", { name: "Filialdagi o'rin" }));
    await user.click(await within(sheet).findByRole("radio", { name: /Laylo Karimova/ }));
    await user.click(within(sheet).getByRole("button", { name: "Almashtirish" }));

    await vi.waitFor(() => expect(headOf("Toshkent 1", "chief_logist")?.username).toBe("laylo_l"));
    expect(headOf("Toshkent 1", "chief_logist")?.permissions).toEqual(permissions);
  });

  it("shows the current keys read-only when the permission catalog is missing", async () => {
    server.use(http.get("*/api/owner/structure/permissions/", () => new HttpResponse(null, { status: 404 })));
    await renderWithProviders(<FilialsScreen />, { searchParams: "?leader=1&role=chief_operator" });

    const dialog = await screen.findByRole("dialog", { name: /Bosh operator: dopusklar/ });
    expect(await within(dialog).findByText(/Dopusk katalogi kelmadi/)).toBeInTheDocument();
    expect(within(dialog).getByText("view.finance")).toBeInTheDocument();
  });

  it("explains why an inactive filial cannot become main", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/owner/structure/filials/:id/set-main/", () =>
        HttpResponse.json({ code: "filial_inactive", detail: "x" }, { status: 409 }),
      ),
    );
    await renderWithProviders(<FilialsScreen />);

    await user.click(within(await cardOf("Toshkent 1")).getByRole("button", { name: "Asosiy qilish" }));
    const dialog = await screen.findByRole("dialog", { name: "Toshkent 1 asosiy filial bo'lsinmi?" });
    await user.click(within(dialog).getByRole("button", { name: "Asosiy qilish" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Nofaol filial asosiy bo'lolmaydi");
  });
});
