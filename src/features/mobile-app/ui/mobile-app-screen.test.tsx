// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { mockGet } from "@/shared/testing/mock-api";
import { renderWithProviders } from "@/shared/testing/render";
import { failNext, server, useMockApi } from "@/shared/testing/server";

import { MobileAppScreen } from "./mobile-app-screen";

const cardOf = (title: string): HTMLElement => {
  const card = screen.getByRole("heading", { name: title }).closest("section");
  if (!card) throw new Error(`no card titled "${title}"`);
  return card;
};

describe("MobileAppScreen", () => {
  useMockApi();

  it("shows the user base, growth and activity KPIs", async () => {
    await renderWithProviders(<MobileAppScreen />, { searchParams: "?period=30d" });

    expect(await screen.findByText("Jami foydalanuvchilar")).toBeInTheDocument();
    expect(screen.getByText("86 400")).toBeInTheDocument();
    expect(screen.getByText("4 120")).toBeInTheDocument();
    expect(screen.getByText("18 420")).toBeInTheDocument();
    expect(screen.getByText("kunlik o'rtacha 3 240")).toBeInTheDocument();
    expect(screen.getByText("Ilova orqali buyurtma")).toBeInTheDocument();
    expect(screen.getByText("22,0%")).toBeInTheDocument();
    expect(screen.getByText("Push yoqilgan")).toBeInTheDocument();
    expect(screen.getByText("71%")).toBeInTheDocument();
  });

  it("splits users by platform, version, market and language", async () => {
    await renderWithProviders(<MobileAppScreen />, { searchParams: "?period=30d" });

    const devices = within(cardOf("Qurilmalar va versiyalar"));
    expect(await devices.findByText("86 400 foydalanuvchi")).toBeInTheDocument();
    expect(devices.getByText("Android")).toBeInTheDocument();
    expect(devices.getByText("68%")).toBeInTheDocument();
    expect(devices.getByText("27 650")).toBeInTheDocument();
    expect(devices.getByText("1.0.63")).toBeInTheDocument();
    expect(devices.getByText("oxirgi")).toBeInTheDocument();
    expect(devices.getByText("eski versiyalar")).toBeInTheDocument();
    expect(devices.getByText("O'zbekiston")).toBeInTheDocument();

    const languages = within(cardOf("Interfeys tili"));
    expect(await languages.findByText("O'zbekcha")).toBeInTheDocument();
    expect(languages.getByText("Ўзбекча (kirill)")).toBeInTheDocument();
  });

  it("draws each user metric on its own chart", async () => {
    await renderWithProviders(<MobileAppScreen />, { searchParams: "?period=30d" });

    // har grafikning jadval egizagi bor — almashtirgich ma'lumot kelgandan keyin chiqadi
    await vi.waitFor(() => expect(screen.getAllByRole("button", { name: "Jadval" })).toHaveLength(2));
    expect(screen.getByRole("heading", { name: "Kunlik faol foydalanuvchilar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Yangi foydalanuvchilar" })).toBeInTheDocument();

    // jadval ko'rinishida faqat shu grafikning o'z seriyasi bor — ikkinchi o'lchov aralashmaydi
    const newUsers = within(cardOf("Yangi foydalanuvchilar"));
    await userEvent.click(newUsers.getByRole("button", { name: "Jadval" }));
    expect(newUsers.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Davr",
      "Ro'yxatdan o'tdi",
    ]);
  });

  it("shows both in-app order funnels and how many orders the retention flow saved", async () => {
    await renderWithProviders(<MobileAppScreen />, { searchParams: "?period=30d" });

    const confirm = within(cardOf("Buyurtmani tasdiqlash voronkasi"));
    expect(await confirm.findByText("Push yuborildi")).toBeInTheDocument();
    expect(confirm.getByText("1 612")).toBeInTheDocument();
    expect(confirm.getByText("Tasdiqlandi")).toBeInTheDocument();
    expect(confirm.getByText("1 396")).toBeInTheDocument();
    expect(confirm.getByText(/114 tasi tushib qoldi/)).toBeInTheDocument();

    const cancel = within(cardOf("Bekor qilish voronkasi"));
    expect(await cancel.findByText("2 · Ushlab qolish ekrani")).toBeInTheDocument();
    expect(cancel.getByText("187")).toBeInTheDocument();
    expect(cancel.getByText("156 ta buyurtma saqlab qolindi")).toBeInTheDocument();
    expect(cancel.getByText(/bekor qilishni boshlaganlarning 72,9%/)).toBeInTheDocument();
  });

  it("shows engagement, consultations, loyalty and the doctors' app", async () => {
    await renderWithProviders(<MobileAppScreen />, { searchParams: "?period=30d" });

    const engagement = within(cardOf("Faollik"));
    expect(await engagement.findByText("AI doktor suhbatlari")).toBeInTheDocument();
    expect(engagement.getByText("6 480")).toBeInTheDocument();

    const consultations = within(cardOf("Onlayn konsultatsiyalar"));
    expect(await consultations.findByText("64,0 mln")).toBeInTheDocument();
    expect(consultations.getByText("812 ta baho")).toBeInTheDocument();
    expect(consultations.getByText("79,6%")).toBeInTheDocument();

    const loyalty = within(cardOf("Ball va sovg'alar"));
    expect(await loyalty.findByText("Hamyonlardagi qoldiq")).toBeInTheDocument();
    expect(loyalty.getByText("≈ 41,2 mln so'm")).toBeInTheDocument();

    const doctorApp = within(cardOf("Doctor Ali Pro"));
    expect(await doctorApp.findByText("Faol shifokorlar")).toBeInTheDocument();
    expect(doctorApp.getByText("236 mln so'm")).toBeInTheDocument();
    expect(doctorApp.getByText("2-bosqichda")).toBeInTheDocument();
  });

  it("says 'no data' for an engagement metric the backend does not collect yet", async () => {
    const sampleEnvelope = mockGet("app/engagement/", { period: "30d" }) as { data: Record<string, unknown> };
    server.use(
      http.get("*/api/owner/app/engagement/", () =>
        HttpResponse.json({ ...sampleEnvelope, data: { ...sampleEnvelope.data, referrals: null } }),
      ),
    );
    await renderWithProviders(<MobileAppScreen />, { searchParams: "?period=30d" });

    const engagement = within(cardOf("Faollik"));
    expect(await engagement.findByText("ma'lumot yo'q")).toBeInTheDocument();
    expect(engagement.getByText("6 480")).toBeInTheDocument();
  });

  it("keeps the rest of the page working when one block fails", async () => {
    failNext("app/engagement/");
    await renderWithProviders(<MobileAppScreen />, { searchParams: "?period=30d" });

    expect(
      await within(cardOf("Faollik")).findByRole("button", { name: "Qayta urinish" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("86 400")).toBeInTheDocument();
    expect(await within(cardOf("Ball va sovg'alar")).findByText("Berilgan ball")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Qayta urinish" })).toHaveLength(1);
  });

  it("hides comparison deltas when the owner turns comparison off", async () => {
    await renderWithProviders(<MobileAppScreen />, { searchParams: "?period=30d&compare=none" });

    expect(await screen.findByText("86 400")).toBeInTheDocument();
    expect(await within(cardOf("Faollik")).findByText("6 480")).toBeInTheDocument();
    expect(screen.queryByText(/o'sdi|kamaydi/)).not.toBeInTheDocument();
  });
});
