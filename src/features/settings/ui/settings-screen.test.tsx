// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockGet } from "@/shared/testing/mock-api";
import { renderWithProviders } from "@/shared/testing/render";
import { server, useMockApi } from "@/shared/testing/server";

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

const renderScreen = () => renderWithProviders(<SettingsScreen />);

describe("SettingsScreen", () => {
  useMockApi();

  afterEach(() => {
    vi.clearAllMocks();
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
