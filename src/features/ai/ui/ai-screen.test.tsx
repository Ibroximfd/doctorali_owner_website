// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { AiScreen } from "./ai-screen";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

describe("AiScreen", () => {
  useMockApi();

  it("shows the health score, money at risk and findings with evidence", async () => {
    await renderWithProviders(<AiScreen />);

    expect(screen.getByRole("heading", { level: 1, name: /Biznes sog'lig'i/ })).toBeInTheDocument();
    // yon ustunda — ishonch chizig'i bilan
    const aside = screen.getByRole("complementary", { name: "AI tuzatishlari" });
    expect(
      await within(aside).findByText("Kuryer #12 da 3,2 mln so'm topshirilmagan naqd"),
    ).toBeInTheDocument();
    expect(within(aside).getByRole("meter", { name: "Ishonch: 86%" })).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("tab", { name: /Topilmalar/ }));
    const panel = screen.getByRole("tabpanel");
    expect(await within(panel).findByText("14 100 000 so'm")).toBeInTheDocument();
    expect(within(panel).getByText("Tasdiqlanmagan raqam")).toBeInTheDocument();
    expect(screen.getByText("Biznes sog'lom bali: 82 / 100")).toBeInTheDocument();
  });

  it("rates a finding and escalates it to an issue", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AiScreen />, { searchParams: "?tab=findings" });
    await within(screen.getByRole("tabpanel")).findByText("Kuryer #12 da 3,2 mln so'm topshirilmagan naqd");

    const [confirm] = screen.getAllByRole("button", { name: "To'g'ri" });
    if (!confirm) throw new Error("tugma yo'q");
    await user.click(confirm);
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Rahmat — AI buni hisobga oladi"));

    const [escalate] = screen.getAllByRole("button", { name: "Muammoga aylantirish" });
    if (!escalate) throw new Error("tugma yo'q");
    await user.click(escalate);
    expect(await screen.findAllByRole("link", { name: "Muammoni ochish" })).not.toHaveLength(0);
  });

  it("answers a chat question with blocks and a downloadable report", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AiScreen />);

    expect(screen.getByRole("tab", { name: "Suhbat" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("Assalomu alaykum! Nimani tahlil qilay?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Bugungi hisobot/ }));
    const conversation = screen.getByRole("region", { name: "AI bilan suhbat" });
    // savol pufakchada (va tarix chipida suhbat nomi sifatida)
    expect(
      await within(conversation).findAllByText(/Bugungi kunlik hisobotni tayyorlab ber/),
    ).not.toHaveLength(0);
    expect(
      await within(conversation).findByText(
        "Bugun jami tushum 312 mln so'm, kechagidan 8% ko'p.",
        {},
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
    expect(within(conversation).getByText("312 mln so'm")).toBeInTheDocument();
    expect(within(conversation).getByRole("link", { name: /Yuklab olish/ })).toHaveAttribute(
      "href",
      "/api/owner/ai/attachments/33/file/",
    );
    // javob tarkibi chiplari — blok sarlavhalari va tayyor fayl
    const parts = within(conversation).getByRole("list", { name: "AI tayyorlagan qismlar" });
    expect(within(parts).getByText("Filiallar")).toBeInTheDocument();
    expect(within(parts).getByText("Kunlik hisobot — 02.10.2026")).toBeInTheDocument();
  });

  it("lists recommendations and checks", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AiScreen />);

    await user.click(screen.getByRole("tab", { name: /Tavsiyalar/ }));
    expect(await screen.findByText("Samarqandga ikkinchi kuryer qo'shing")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Tekshiruvlar/ }));
    expect(await screen.findAllByText("Yetkazilgan COD ↔ olingan pul")).not.toHaveLength(0);
  });

  it("approves an AI fix and lets the owner pause the autopilot", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AiScreen />);

    await user.click(screen.getByRole("tab", { name: /Avto-tuzatish/ }));
    const panel = screen.getByRole("tabpanel");
    expect(
      await within(panel).findByText("Samarqanddagi 6 ta buyurtmani kuryerlarga biriktirish"),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Jasur Karimov")).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: "Tasdiqlash" }));
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Tasdiqlandi — bajarilmoqda"));

    const killSwitch = await screen.findByRole("switch", {
      name: "Avtomatik tuzatishlarni yoqish yoki to'xtatish",
    });
    await user.click(killSwitch);
    expect(await screen.findByText("Avtopilot to'xtatilgan")).toBeInTheDocument();
  });

  it("renders chart and link blocks in a chat answer", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AiScreen />);
    await user.click(await screen.findByRole("button", { name: /Bugungi hisobot/ }));
    const conversation = screen.getByRole("region", { name: "AI bilan suhbat" });
    expect(
      await within(conversation).findByRole("link", { name: /Ombor bo'limi/ }, { timeout: 4000 }),
    ).toHaveAttribute("href", expect.stringContaining("/warehouse"));
    expect(within(conversation).getByRole("button", { name: /DA-184011/ })).toBeInTheDocument();
  });
});
