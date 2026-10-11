// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockGet, mockSend } from "@/shared/testing/mock-api";
import { renderWithProviders } from "@/shared/testing/render";
import { server, useMockApi } from "@/shared/testing/server";

import { currentMonth } from "../model/settings.rules";
import { SettingsScreen } from "./settings-screen";

const { refresh, setLocaleAction, setTheme } = vi.hoisted(() => ({
  refresh: vi.fn(),
  setLocaleAction: vi.fn(async (_locale: string): Promise<void> => {}),
  setTheme: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light", setTheme }) }));
// jsdom da App Router yo'q — `router.refresh()` chaqirilganini tekshirish kifoya.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
// Server action cookie yozadi (`next/headers`) — testda faqat chaqiruvning o'zi kerak.
vi.mock("@/i18n/set-locale", () => ({ setLocaleAction }));

const MLN = 1_000_000;
/** Ekran joriy oyni soatdan oladi — test ham xuddi shu oyni so'raydi. */
const month = currentMonth(new Date());

type StoredTargets = { month: string; items: { filial: number | null; channel: string; amount: number }[] };
const storedTargets = (): StoredTargets => mockGet("targets/", { month }) as StoredTargets;
const storedAmount = (filial: number | null, channel: string): number | undefined =>
  storedTargets().items.find((item) => item.filial === filial && item.channel === channel)?.amount;

const initialTargets = storedTargets();

const renderScreen = () =>
  renderWithProviders(<SettingsScreen alertRules={<p>Signal chegaralari kartasi</p>} />);

const deliveryInput = (filial: string) =>
  screen.findByLabelText(`${filial} — yetkazib berish rejasi, mln so'm`);

const retype = async (input: HTMLElement, text: string) => {
  await userEvent.clear(input);
  await userEvent.type(input, text);
};

const cardOf = (title: string | RegExp): HTMLElement => {
  const card = screen.getByRole("heading", { name: title }).closest("section");
  if (!card) throw new Error(`no card titled "${String(title)}"`);
  return card;
};

describe("SettingsScreen", () => {
  useMockApi();

  afterEach(() => {
    // Reja namuna serverining xotirasida saqlanadi — har testdan keyin boshlang'ich holatga qaytariladi.
    mockSend("PUT", "targets/", initialTargets);
    vi.clearAllMocks();
  });

  describe("monthly targets", () => {
    it("lists every filial, with a clinic field only where there is a clinic", async () => {
      await renderScreen();

      expect(await deliveryInput("Toshkent")).toHaveValue("1100");
      expect(screen.getByLabelText("Qo'qon — klinika rejasi, mln so'm")).toHaveValue("190");
      expect(screen.getByLabelText("Samarqand — yetkazib berish rejasi, mln so'm")).toHaveValue("420");
      expect(screen.queryByLabelText("Samarqand — klinika rejasi, mln so'm")).not.toBeInTheDocument();
    });

    it("shows column totals and the overall plan, and updates them while typing", async () => {
      await renderScreen();
      const targets = within(cardOf(/^Oylik reja/));

      expect(await targets.findByText("2,00 mlrd")).toBeInTheDocument();
      expect(targets.getByText("530 mln")).toBeInTheDocument();
      expect(targets.getByText("Jami reja (konsultatsiya 70,0 mln bilan)")).toBeInTheDocument();
      expect(targets.getByText("2,60 mlrd so'm")).toBeInTheDocument();

      await retype(await deliveryInput("Toshkent"), "1 200");

      expect(targets.getByText("2,10 mlrd")).toBeInTheDocument();
      expect(targets.getByText("2,70 mlrd so'm")).toBeInTheDocument();
    });

    it("rejects a negative amount or text on the field itself and saves nothing", async () => {
      await renderScreen();
      const input = await deliveryInput("Toshkent");

      await retype(input, "-5");
      await userEvent.click(screen.getByRole("button", { name: "Saqlash" }));

      expect(await screen.findByText("Manfiy bo'lmasin")).toBeInTheDocument();
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription("Manfiy bo'lmasin");

      await retype(input, "abc");
      await userEvent.click(screen.getByRole("button", { name: "Saqlash" }));

      expect(await screen.findByText("Son kiriting")).toBeInTheDocument();
      expect(toast.success).not.toHaveBeenCalled();
      expect(storedAmount(1, "delivery")).toBe(1100 * MLN);
    });

    it("saves the edited plan in so'm and keeps the targets the table does not edit", async () => {
      await renderScreen();

      await retype(await deliveryInput("Toshkent"), "1200");
      await retype(screen.getByLabelText("Qo'qon — klinika rejasi, mln so'm"), "200,5");
      await userEvent.click(screen.getByRole("button", { name: "Saqlash" }));

      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Saqlandi"));
      expect(storedAmount(1, "delivery")).toBe(1200 * MLN);
      expect(storedAmount(2, "clinic")).toBe(200_500_000);
      expect(storedAmount(3, "delivery")).toBe(420 * MLN);
      expect(storedAmount(null, "consultation")).toBe(70 * MLN);
      expect(screen.getByRole("button", { name: "Saqlash" })).toBeEnabled();
    });

    it("says so when the save fails and keeps what the owner typed", async () => {
      server.use(
        http.put("*/api/owner/targets/", () => HttpResponse.json({ code: "server_error" }, { status: 500 })),
      );
      await renderScreen();
      const input = await deliveryInput("Toshkent");

      await retype(input, "1300");
      await userEvent.click(screen.getByRole("button", { name: "Saqlash" }));

      await vi.waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Saqlab bo'lmadi. Qayta urinib ko'ring."),
      );
      expect(input).toHaveValue("1300");
      expect(storedAmount(1, "delivery")).toBe(1100 * MLN);
    });
  });

  it("places the alert thresholds card it is given next to its own cards", async () => {
    await renderScreen();

    expect(screen.getByText("Signal chegaralari kartasi")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kirish huquqlari" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Xavfsizlik va ko'rinish" })).toBeInTheDocument();
  });

  it("lists who can see the panel, read-only", async () => {
    await renderScreen();
    const access = within(cardOf("Kirish huquqlari"));

    // desktop jadvali va telefon kartalari bir vaqtda DOM da — shuning uchun har matn ikki marta
    expect((await access.findAllByText("Bosh hisobchi")).length).toBeGreaterThan(0);
    expect(access.getAllByText("Egasi").length).toBeGreaterThan(0);
    expect(access.getAllByText("Moliya, Hisobotlar").length).toBeGreaterThan(0);
    expect(access.getAllByText("Hammasi").length).toBeGreaterThan(0);
    await vi.waitFor(() => expect(access.getAllByText("Toshkent").length).toBeGreaterThan(0));
    expect(access.getAllByText("Maskalangan").length).toBeGreaterThan(0);
    expect(access.queryByRole("button")).not.toBeInTheDocument();
  });

  it("switches the interface language through the server action and re-renders the page", async () => {
    await renderScreen();

    expect(screen.getByRole("button", { name: "O'zbekcha" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "O'zbekcha" }));
    expect(setLocaleAction).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Русский" }));

    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(setLocaleAction).toHaveBeenCalledWith("ru");
  });

  it("flips the theme to the opposite of the one in use", async () => {
    await renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Mavzuni almashtirish" }));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  /* Uzilgan sessiya namuna serverida qaytarilmaydi — shuning uchun muvaffaqiyatli uzish eng oxirida. */
  describe("sessions", () => {
    const sessionIds = () =>
      (mockGet("sessions/") as { results: { id: string }[] }).results.map((session) => session.id);
    const openRevokeDialog = async () => {
      await userEvent.click(await screen.findByRole("button", { name: "Chiqarish: MacBook · Chrome" }));
      return screen.findByRole("dialog", { name: "Qurilmani paneldan chiqarasizmi?" });
    };

    it("marks the current device and offers to revoke only the other one", async () => {
      await renderScreen();
      const devices = within(await screen.findByRole("list", { name: "Faol qurilmalar" }));

      expect(devices.getByText("iPhone 15 · Safari")).toBeInTheDocument();
      expect(devices.getByText("Toshkent · hozir faol")).toBeInTheDocument();
      expect(devices.getByText("Bu qurilma")).toBeInTheDocument();
      expect(devices.getByText("MacBook · Chrome")).toBeInTheDocument();
      expect(devices.getAllByRole("button")).toHaveLength(1);
      expect(screen.getByText("Yoqilgan")).toBeInTheDocument();
    });

    it("asks before revoking and does nothing when the owner cancels", async () => {
      await renderScreen();
      const dialog = await openRevokeDialog();

      expect(
        within(dialog).getByText(/«MacBook · Chrome» qurilmasidagi sessiya yopiladi/),
      ).toBeInTheDocument();
      await userEvent.click(within(dialog).getByRole("button", { name: "Bekor qilish" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("MacBook · Chrome")).toBeInTheDocument();
      expect(sessionIds()).toHaveLength(2);
    });

    it("keeps the dialog open with the reason when revoking fails", async () => {
      server.use(
        http.delete("*/api/owner/sessions/:id/", () =>
          HttpResponse.json({ code: "server_error" }, { status: 500 }),
        ),
      );
      await renderScreen();
      const dialog = await openRevokeDialog();

      await userEvent.click(within(dialog).getByRole("button", { name: "Chiqarish" }));

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "Serverda xatolik. Bir ozdan so'ng qayta urinib ko'ring.",
      );
      expect(screen.getByText("MacBook · Chrome")).toBeInTheDocument();
      expect(sessionIds()).toHaveLength(2);
    });

    it("revokes the session after confirmation and removes it from the list", async () => {
      await renderScreen();
      const dialog = await openRevokeDialog();

      await userEvent.click(within(dialog).getByRole("button", { name: "Chiqarish" }));

      await vi.waitFor(() => expect(screen.queryByText("MacBook · Chrome")).not.toBeInTheDocument());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith("Qurilma paneldan chiqarildi");
      expect(screen.getByText("iPhone 15 · Safari")).toBeInTheDocument();
      expect(sessionIds()).toEqual(["s-iphone"]);
    });
  });
});
