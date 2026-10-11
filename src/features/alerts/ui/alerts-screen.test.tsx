// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { Toaster, toast } from "sonner";
import { afterEach, describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { failNext, server, useMockApi } from "@/shared/testing/server";

import { AlertsScreen } from "./alerts-screen";

/**
 * "Ko'rildi" belgilari namuna serverining xotirasida qoladi (fayl ichida testdan
 * testga o'tadi) — shuning uchun boshlang'ich holatga tayanadigan test birinchi,
 * keyingilari sanoqni ekranning o'zidan o'qiydi.
 */
const CRITICAL = ["Kuryerda naqd 2 kundan beri topshirilmagan", "Kassa yopilishida kamomad: −180 000 so'm"];
const SERIOUS = "18 ta tasdiqlangan buyurtma 3 soatdan ortiq kuryersiz";
const MODERATE = "2 mahsulot tugadi, 4 tasi kam qoldi";
const LAGGING_FILIAL = "Samarqand jamoasi: bir operatorga sotuv o'rtachadan 17% past";

const renderScreen = (searchParams = "") =>
  renderWithProviders(
    <>
      <AlertsScreen />
      <Toaster />
    </>,
    { searchParams },
  );

const list = () => within(screen.getByRole("region", { name: "Ochiq signallar" }));
const chip = (name: string): HTMLElement =>
  list().getByRole("button", { name: new RegExp(`^${name}\\s*\\d+$`) });
const chipCount = (name: string): number => Number(/\d+$/.exec(chip(name).textContent ?? "")?.[0]);

/** "Qoidalar" kartasi (har karta — `section`). */
const rulesCard = (): HTMLElement => {
  const section = screen.getByRole("heading", { name: "Qoidalar" }).closest("section");
  if (!section) throw new Error("Qoidalar kartasi topilmadi");
  return section;
};

/** Signal qatori (sarlavhasi bo'yicha) — amallar shu qator ichidan qidiriladi. */
const alertRow = (title: string): HTMLElement => {
  const row = list().getByText(title).closest("li");
  if (!row) throw new Error(`"${title}" signali topilmadi`);
  return row;
};

describe("AlertsScreen", () => {
  useMockApi();

  // sonner bildirishnomalarni global saqlaydi — keyingi testga o'tmasin
  afterEach(() => {
    toast.dismiss();
  });

  it("lists the open alerts with counts per severity, actions and the rules behind them", async () => {
    await renderScreen();

    expect(await list().findByText(SERIOUS)).toBeInTheDocument();
    expect(chip("Barchasi")).toHaveTextContent("Barchasi10");
    expect(chip("Kritik")).toHaveTextContent("Kritik2");
    expect(chip("Jiddiy")).toHaveTextContent("Jiddiy4");
    expect(chip("O'rta")).toHaveTextContent("O'rta4");
    expect(chip("Barchasi")).toHaveAttribute("aria-pressed", "true");

    // har signalda: tegishli bo'limga havola, "ko'rildi" va toifa
    const cod = within(alertRow(CRITICAL[0] ?? ""));
    expect(cod.getByRole("link", { name: `Ko'rish: ${CRITICAL[0]}` })).toHaveAttribute("href", "/logistics");
    expect(cod.getByRole("button", { name: `Ko'rildi: ${CRITICAL[0]}` })).toBeEnabled();
    expect(cod.getByText("Naqd pul")).toBeInTheDocument();
    expect(within(alertRow(MODERATE)).getByRole("link", { name: /^Ko'rish/ })).toHaveAttribute(
      "href",
      "/products",
    );
    // filial jamoasi ortda qolgani — "Sotuv jamoasi" bo'limiga olib boradi
    const lagging = within(alertRow(LAGGING_FILIAL));
    expect(lagging.getByRole("link", { name: /^Ko'rish/ })).toHaveAttribute("href", "/sales");
    expect(lagging.getByText("Sotuv jamoasi")).toBeInTheDocument();

    // qoidalar xulosasi: yorliq + chegara birligi bilan; o'chirilgan qoida belgilangan
    const rules = within(rulesCard());
    expect(await rules.findByText("Tasdiqlangan buyurtma kuryersiz")).toBeInTheDocument();
    expect(rules.getByText("3 soat")).toBeInTheDocument();
    expect(rules.getByText("5,0 mln so'm")).toBeInTheDocument();
    // 15% — ikki qoidada: kunlik atkaz ulushi va ortda qolgan filial jamoasi
    expect(rules.getAllByText("15%")).toHaveLength(2);
    expect(rules.getByText("10 ta")).toBeInTheDocument();
    expect(rules.getByText("o'chirilgan")).toBeInTheDocument();
    expect(rules.getByRole("link", { name: "Sozlash" })).toHaveAttribute("href", "/settings");
  });

  it("narrows the list to one severity and back", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await list().findByText(SERIOUS);

    await user.click(chip("O'rta"));

    expect(chip("O'rta")).toHaveAttribute("aria-pressed", "true");
    expect(list().getByText(MODERATE)).toBeInTheDocument();
    expect(list().queryByText(SERIOUS)).not.toBeInTheDocument();
    expect(list().getAllByRole("button", { name: /^Ko'rildi:/ })).toHaveLength(chipCount("O'rta"));

    await user.click(chip("Barchasi"));

    expect(list().getByText(SERIOUS)).toBeInTheDocument();
    expect(list().getAllByRole("button", { name: /^Ko'rildi:/ })).toHaveLength(chipCount("Barchasi"));
  });

  it("opens with the severity from the link and ignores an unknown one", async () => {
    const { unmount } = await renderScreen("?severity=serious");

    expect(await list().findByText(SERIOUS)).toBeInTheDocument();
    expect(chip("Jiddiy")).toHaveAttribute("aria-pressed", "true");
    expect(list().queryByText(MODERATE)).not.toBeInTheDocument();
    unmount();

    await renderScreen("?severity=urgent");

    expect(await list().findByText(MODERATE)).toBeInTheDocument();
    expect(chip("Barchasi")).toHaveAttribute("aria-pressed", "true");
  });

  it("says so when acknowledging fails and keeps the alert open", async () => {
    server.use(
      http.post("*/api/owner/alerts/:id/ack/", () =>
        HttpResponse.json({ code: "server_error", detail: "server_error" }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    await renderScreen();
    await list().findByText(SERIOUS);
    const before = chipCount("Barchasi");

    await user.click(list().getByRole("button", { name: `Ko'rildi: ${SERIOUS}` }));

    expect(await screen.findByText("Saqlab bo'lmadi. Qayta urinib ko'ring.")).toBeInTheDocument();
    await waitFor(() => expect(list().getByRole("button", { name: `Ko'rildi: ${SERIOUS}` })).toBeEnabled());
    expect(chipCount("Barchasi")).toBe(before);
  });

  it("moves an acknowledged alert out of the open list and lowers the counts", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await list().findByText(SERIOUS);
    const [openBefore, seriousBefore] = [chipCount("Barchasi"), chipCount("Jiddiy")];

    await user.click(list().getByRole("button", { name: `Ko'rildi: ${SERIOUS}` }));

    await waitFor(() => expect(chipCount("Barchasi")).toBe(openBefore - 1));
    expect(chipCount("Jiddiy")).toBe(seriousBefore - 1);
    // signal "Ko'rilgan" bo'limiga o'tdi — endi amallarsiz
    expect(list().getByRole("heading", { name: "Ko'rilgan" })).toBeInTheDocument();
    expect(list().getByText(/^\d+ ta · sabab yo'qolgach ro'yxatdan chiqadi$/)).toBeInTheDocument();
    expect(list().getByText(SERIOUS)).toBeInTheDocument();
    expect(list().queryByRole("button", { name: `Ko'rildi: ${SERIOUS}` })).not.toBeInTheDocument();
  });

  it("explains an empty severity and offers to show all alerts again", async () => {
    const user = userEvent.setup();
    await renderScreen("?severity=critical");
    await list().findByText(CRITICAL[0] ?? "");

    for (const title of CRITICAL)
      await user.click(list().getByRole("button", { name: `Ko'rildi: ${title}` }));

    expect(await list().findByText("Bu darajada signal yo'q")).toBeInTheDocument();
    expect(chipCount("Kritik")).toBe(0);

    await user.click(list().getByRole("button", { name: "Barchasini ko'rsatish" }));

    expect(chip("Barchasi")).toHaveAttribute("aria-pressed", "true");
    expect(list().getByText(MODERATE)).toBeInTheDocument();
  });

  it("shows the all-clear state when nothing is open", async () => {
    server.use(
      http.get("*/api/owner/alerts/", () =>
        HttpResponse.json({ counts: { open: 0, critical: 0, serious: 0, moderate: 0 }, results: [] }),
      ),
    );
    await renderScreen();

    expect(await list().findByText("Hammasi joyida")).toBeInTheDocument();
    expect(list().getByText("Hozircha e'tibor talab qiladigan narsa yo'q.")).toBeInTheDocument();
    expect(chipCount("Barchasi")).toBe(0);
    expect(list().queryByRole("button", { name: "Barchasini ko'rsatish" })).not.toBeInTheDocument();
  });

  it("keeps the alerts usable when the rules fail to load, and the rules when the alerts fail", async () => {
    failNext("alerts/rules/");
    const { unmount } = await renderScreen();

    expect(await list().findByText(MODERATE)).toBeInTheDocument();
    expect(await within(rulesCard()).findByRole("button", { name: "Qayta urinish" })).toBeInTheDocument();
    unmount();

    server.resetHandlers();
    failNext("alerts/");
    await renderScreen();

    expect(await list().findByRole("button", { name: "Qayta urinish" })).toBeInTheDocument();
    expect(await screen.findByText("Kunlik atkaz ulushi")).toBeInTheDocument();
  });
});
