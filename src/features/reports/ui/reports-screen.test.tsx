// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { Toaster, toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { resetReportsMock } from "@/shared/testing/fixtures/handlers/reports";
import { TEST_NOW, mockGet } from "@/shared/testing/mock-api";
import { renderWithProviders } from "@/shared/testing/render";
import { failNext, server, useMockApi } from "@/shared/testing/server";

import { digestSchema, exportsResponseSchema } from "../model/reports.schema";
import { ReportsScreen } from "./reports-screen";

/** Testda holat tez so'raladi — ikkinchi so'rovda fayl "tayyor" bo'ladi. */
const POLL_MS = 25;

const renderScreen = () =>
  renderWithProviders(
    <>
      <ReportsScreen pollIntervalMs={POLL_MS} />
      <Toaster />
    </>,
  );

/** Kartani sarlavhasi bo'yicha topadi (har karta — `section`). */
const card = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`"${title}" kartasi topilmadi`);
  return section;
};

/** Desktop jadvalidagi qatorlar (telefon kartalari alohida ro'yxatda takrorlanadi). */
const historyRows = (): HTMLElement[] => within(card("Eksport tarixi")).getAllByRole("row").slice(1);

/** Tarixdagi eng yangi qator. */
const newestRow = (): HTMLElement => {
  const [row] = historyRows();
  if (!row) throw new Error("Eksport tarixi bo'sh");
  return row;
};

const savedDigest = () => parseJson(digestSchema, mockGet("reports/digest/"));
const savedExports = () => parseJson(exportsResponseSchema, mockGet("reports/exports/")).results;

describe("ReportsScreen", () => {
  useMockApi();

  beforeEach(() => {
    resetReportsMock();
    // Namuna "hozir" i qat'iy (TEST_NOW) — havola muddati shu soatga nisbatan tekshiriladi. Taymerlar haqiqiy.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TEST_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    // sonner bildirishnomalarni global saqlaydi — keyingi testga o'tmasin
    toast.dismiss();
  });

  it("lists the ready-made reports, each as Excel and PDF", async () => {
    await renderScreen();

    const reports = within(card("Tayyor hisobotlar"));
    for (const title of [
      "Kunlik yakun",
      "Haftalik hisobot",
      "Oylik moliya (P&L)",
      "Operatorlar",
      "Kuryerlar va naqd",
      "Qarzdorlar",
      "Mahsulotlar",
    ]) {
      expect(reports.getByText(title)).toBeInTheDocument();
      expect(reports.getByRole("button", { name: `${title} — Excel` })).toBeEnabled();
      expect(reports.getByRole("button", { name: `${title} — PDF` })).toBeEnabled();
    }
    // davr va filial shu yerda tanlanadi; filiallar ro'yxati `meta/` dan
    expect(reports.getByLabelText("Davr")).toHaveValue("30d");
    expect(await reports.findByRole("option", { name: "Samarqand" })).toBeInTheDocument();
  });

  it("shows the export history with statuses and offers a download only while the link is alive", async () => {
    await renderScreen();

    const history = within(card("Eksport tarixi"));
    expect((await history.findAllByText("01.09.2026 – 30.09.2026")).length).toBeGreaterThan(0);
    expect(history.getAllByText("Barchasi").length).toBeGreaterThan(0);
    // 5 soat oldin tayyor bo'lgan faylning 1 soatlik havolasi o'tib ketgan
    expect(history.getAllByText("Havola muddati tugagan").length).toBeGreaterThan(0);
    expect(history.queryByRole("link", { name: /Oylik moliya/ })).not.toBeInTheDocument();
  });

  it("polls a pending export until it is ready and then links to the file", async () => {
    await renderScreen();

    const pending = (await within(card("Eksport tarixi")).findAllByText("Tayyorlanmoqda"))[0];
    expect(pending).toBeInTheDocument();

    const link = await within(card("Eksport tarixi")).findAllByRole("link", {
      name: "Yuklab olish: Operatorlar",
    });
    expect(link[0]).toHaveAttribute("href", "/api/owner/reports/export/exp-1003/file/");
    expect(within(card("Eksport tarixi")).queryByText("Tayyorlanmoqda")).not.toBeInTheDocument();
  });

  it("requests an export for the chosen period and branch and links to the file once it is ready", async () => {
    const user = userEvent.setup();
    await renderScreen();
    const reports = within(card("Tayyor hisobotlar"));
    await reports.findByRole("option", { name: "Qo'qon" });

    await user.selectOptions(reports.getByLabelText("Davr"), "O'tgan oy");
    await user.selectOptions(reports.getByLabelText("Filial"), "Qo'qon");
    await user.click(reports.getByRole("button", { name: "Qarzdorlar — PDF" }));

    expect(
      await screen.findByText("Hisobot tayyorlanmoqda — eksport tarixida ko'rinadi"),
    ).toBeInTheDocument();
    // yangi ish tarix boshida, tanlangan davr va filial bilan
    await waitFor(() => expect(historyRows()).toHaveLength(4));
    const created = within(newestRow());
    expect(created.getByText("Qarzdorlar")).toBeInTheDocument();
    expect(created.getByText("01.09.2026 – 30.09.2026")).toBeInTheDocument();
    expect(created.getByText("Qo'qon")).toBeInTheDocument();
    expect(created.getByText("PDF")).toBeInTheDocument();

    expect(await created.findByText("Tayyor")).toBeInTheDocument();
    expect(created.getByRole("link", { name: "Yuklab olish: Qarzdorlar" })).toHaveAttribute(
      "href",
      "/api/owner/reports/export/exp-1004/file/",
    );
    expect(savedExports()[0]).toMatchObject({
      report: "debts",
      format: "pdf",
      filial: "Qo'qon",
      status: "ready",
    });
  });

  it("says so when an export cannot be requested and leaves the history as it was", async () => {
    server.use(
      http.post("*/api/owner/reports/export/", () =>
        HttpResponse.json({ code: "server_error", detail: "server_error" }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    await renderScreen();

    await user.click(within(card("Tayyor hisobotlar")).getByRole("button", { name: "Kunlik yakun — Excel" }));

    expect(await screen.findByText("Hisobotni so'rab bo'lmadi. Qayta urinib ko'ring.")).toBeInTheDocument();
    expect(savedExports()).toHaveLength(3);
    expect(
      within(card("Tayyor hisobotlar")).getByRole("button", { name: "Kunlik yakun — Excel" }),
    ).toBeEnabled();
  });

  it("previews the Telegram digest built from today's numbers", async () => {
    await renderScreen();

    const digest = within(card("Telegram kunlik xulosa"));
    expect(await digest.findByText("Doctor Ali · 02.10.2026 yakuni")).toBeInTheDocument();
    expect(digest.getByText(/Tushum:/)).toHaveTextContent("Tushum: 48,1 mln (kecha shu vaqtdagidan +6,2%)");
    expect(digest.getByText(/Buyurtma:/)).toHaveTextContent("Buyurtma: 131 · yetkazildi 96 · atkaz 14");
    expect(digest.getByText(/Kuryerlarda naqd:/)).toHaveTextContent("Kuryerlarda naqd: 9,4 mln");
    expect(digest.getByText(/Ochiq signallar:/)).toHaveTextContent(/Ochiq signallar: \d+ \(\d+ kritik\)/);
    expect(digest.getByRole("switch", { name: "Kunlik xulosa" })).toBeChecked();
    expect(digest.getByLabelText("Yuborish vaqti")).toHaveValue("21:00");
  });

  it("rejects a malformed send time on the field and saves nothing", async () => {
    const user = userEvent.setup();
    await renderScreen();
    const digest = within(card("Telegram kunlik xulosa"));
    const time = await digest.findByLabelText("Yuborish vaqti");

    await user.clear(time);
    await user.type(time, "25:99");
    await user.click(digest.getByRole("button", { name: "Saqlash" }));

    expect(await digest.findByRole("alert")).toHaveTextContent(
      "Vaqtni SS:DD ko'rinishida kiriting, masalan 21:00",
    );
    expect(time).toHaveAttribute("aria-invalid", "true");
    expect(time).toHaveAccessibleDescription(/Vaqtni SS:DD ko'rinishida kiriting/);
    expect(savedDigest().time).toBe("21:00");
  });

  it("saves a valid send time and confirms it", async () => {
    const user = userEvent.setup();
    await renderScreen();
    const digest = within(card("Telegram kunlik xulosa"));
    const time = await digest.findByLabelText("Yuborish vaqti");

    await user.clear(time);
    await user.type(time, "08:30");
    await user.click(digest.getByRole("button", { name: "Saqlash" }));

    expect(await screen.findByText("Saqlandi")).toBeInTheDocument();
    expect(digest.queryByRole("alert")).not.toBeInTheDocument();
    expect(time).toHaveValue("08:30");
    expect(savedDigest()).toMatchObject({ time: "08:30", enabled: true });
  });

  it("turns the digest off with the switch without touching the send time", async () => {
    const user = userEvent.setup();
    await renderScreen();
    const digest = within(card("Telegram kunlik xulosa"));

    await user.click(await digest.findByRole("switch", { name: "Kunlik xulosa" }));

    await waitFor(() => expect(digest.getByRole("switch", { name: "Kunlik xulosa" })).not.toBeChecked());
    expect(digest.getByText("O'chirilgan")).toBeInTheDocument();
    expect(savedDigest()).toMatchObject({ enabled: false, time: "21:00" });
  });

  it("keeps the entered time and says so when saving fails", async () => {
    server.use(
      http.put("*/api/owner/reports/digest/", () =>
        HttpResponse.json({ code: "server_error", detail: "server_error" }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    await renderScreen();
    const digest = within(card("Telegram kunlik xulosa"));
    const time = await digest.findByLabelText("Yuborish vaqti");

    await user.clear(time);
    await user.type(time, "07:15");
    await user.click(digest.getByRole("button", { name: "Saqlash" }));

    expect(await screen.findByText("Saqlab bo'lmadi. Qayta urinib ko'ring.")).toBeInTheDocument();
    expect(time).toHaveValue("07:15");
    expect(savedDigest().time).toBe("21:00");
  });

  it("keeps the rest of the page working when one block fails", async () => {
    failNext("reports/digest/");
    await renderScreen();

    expect(
      await within(card("Telegram kunlik xulosa")).findByRole("button", { name: "Qayta urinish" }),
    ).toBeInTheDocument();
    expect(
      within(card("Tayyor hisobotlar")).getByRole("button", { name: "Kunlik yakun — PDF" }),
    ).toBeEnabled();
    expect((await within(card("Eksport tarixi")).findAllByText("Kuryerlar va naqd")).length).toBeGreaterThan(
      0,
    );
  });
});
