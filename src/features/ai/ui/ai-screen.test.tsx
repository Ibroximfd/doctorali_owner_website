// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { server, useMockApi } from "@/shared/testing/server";

import { AiScreen } from "./ai-screen";

const FINDING = "Janub bosh kuryeri T2 ga pulni 3 kunda bir topshirmoqda";

describe("AiScreen", () => {
  useMockApi();
  afterEach(() => vi.restoreAllMocks());

  it("opens on the saved analysis: AI summary and findings grouped by severity", async () => {
    await renderWithProviders(<AiScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "AI tahlil" })).toBeInTheDocument();
    const panel = screen.getByRole("tabpanel");
    expect(await within(panel).findByText(FINDING)).toBeInTheDocument();
    expect(within(panel).getAllByRole("region", { name: "Shoshilinch" }).length).toBeGreaterThan(0);
    expect(within(panel).getByRole("region", { name: "Yaxshi" })).toBeInTheDocument();
    expect(
      within(panel).getByText("Janub skladida Kardiomed 24 dona qoldi (minimal 60)"),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Pul va sotuv joyida, lekin T2 orqada.")).toBeInTheDocument();
    expect(within(panel).getAllByText("Bosh logist (B.L)").length).toBeGreaterThan(0);
    for (const tab of ["Tahlil", "Chat", "Loyihalar", "Xarajat"])
      expect(screen.getByRole("tab", { name: new RegExp(tab) })).toBeInTheDocument();
  });

  it("asks AI to refresh only for an unrefreshed period", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AiScreen />, { searchParams: "?aiPeriod=7d" });

    expect(await screen.findByText(/AI xulosasi hali olinmagan/)).toBeInTheDocument();
    expect(screen.getByText(FINDING)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yangilash" }));
    expect(await screen.findByText("Pul va sotuv joyida, lekin T2 orqada.")).toBeInTheDocument();
  });

  it("keeps the findings when the refresh says there is no AI key (503)", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/owner/ai/analysis/", () =>
        HttpResponse.json({ code: "ai_unavailable", detail: "x", analysis: {} }, { status: 503 }),
      ),
    );
    await renderWithProviders(<AiScreen />);

    await user.click(await screen.findByRole("button", { name: "Yangilash" }));
    expect(
      await screen.findByText(/AI kaliti qo'yilmagan — topilmalar kod bilan qayta hisoblandi/),
    ).toBeInTheDocument();
    expect(screen.getByText(FINDING)).toBeInTheDocument();
  });

  it("says the analysis is running on 409", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/owner/ai/analysis/", () =>
        HttpResponse.json({ code: "analysis_running", detail: "x" }, { status: 409 }),
      ),
    );
    await renderWithProviders(<AiScreen />);

    await user.click(await screen.findByRole("button", { name: "Yangilash" }));
    expect(await screen.findByText(/hozir hisoblanmoqda/)).toBeInTheDocument();
  });

  it("starts a chat from a starter and shows the answer with its sources", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AiScreen />, { searchParams: "?tab=chat" });

    expect(await screen.findByRole("button", { name: /^Atkaz nega oshdi\?/ })).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /Pul qayerda/ }));
    const conversation = screen.getByRole("region", { name: "AI bilan suhbat" });
    expect(await within(conversation).findByText(/Yetkazilgan zakazlardan .* tushdi/)).toBeInTheDocument();
    const sources = within(conversation).getByRole("list", { name: "Manba" });
    expect(within(sources).getByText("Moliya")).toBeInTheDocument();
  });

  it("explains a missing AI key when a message is sent (503) and offers no retry", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/owner/ai/chats/:id/messages/", () =>
        HttpResponse.json({ code: "ai_unavailable", detail: "x" }, { status: 503 }),
      ),
    );
    await renderWithProviders(<AiScreen />, { searchParams: "?tab=chat&chat=3" });

    await user.type(await screen.findByLabelText(/Savolingizni yozing/), "Qaysi filial yaxshi?");
    await user.click(screen.getByRole("button", { name: "Yuborish" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /AI hozircha javob bermayapti .* savol saqlanmadi/,
    );
    expect(screen.queryByRole("button", { name: "Qayta yuborish" })).not.toBeInTheDocument();
  });

  it("renders a report answer as sections and a table, with Excel/PDF and copy", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AiScreen />, { searchParams: "?tab=chat&chat=3" });

    await user.type(await screen.findByLabelText(/Savolingizni yozing/), "Filiallar bo'yicha hisobot kerak");
    await user.click(screen.getByRole("button", { name: "Yuborish" }));
    const conversation = screen.getByRole("region", { name: "AI bilan suhbat" });
    expect(await within(conversation).findByText("Hisobot tayyor — faylni yuklab oling")).toBeInTheDocument();
    const [table] = within(conversation).getAllByRole("table");
    expect(table).toBeDefined();
    expect(within(conversation).queryByText(/\|---/)).not.toBeInTheDocument();
    expect(within(conversation).queryByText(/^## /)).not.toBeInTheDocument();
    expect(within(conversation).getAllByRole("button", { name: "Excel" }).length).toBeGreaterThan(0);
    expect(within(conversation).getAllByRole("button", { name: "PDF" }).length).toBeGreaterThan(0);
    expect(within(conversation).getAllByRole("button", { name: "Nusxa olish" }).length).toBeGreaterThan(0);
  });

  it("locks the input while AI thinks and shows the 10–30 s hint", async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    server.use(
      http.post("*/api/owner/ai/chats/:id/messages/", async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ code: "ai_refused", detail: "x" }, { status: 422 });
      }),
    );
    await renderWithProviders(<AiScreen />, { searchParams: "?tab=chat&chat=3" });

    const input = await screen.findByLabelText(/Savolingizni yozing/);
    await user.type(input, "Qaysi filial yaxshi?");
    await user.click(screen.getByRole("button", { name: "Yuborish" }));
    expect(await screen.findByText("AI o'ylayapti…")).toBeInTheDocument();
    expect(screen.getByText(/Odatda 10–30 soniya/)).toBeInTheDocument();
    expect(input).toBeDisabled();
    release();
    expect(await screen.findByRole("alert")).toHaveTextContent(/savolni boshqacha/);
    expect(screen.queryByRole("button", { name: "Qayta yuborish" })).not.toBeInTheDocument();
  });

  it("after a timeout re-reads the history and shows the saved answer instead of a resend", async () => {
    const user = userEvent.setup();
    const question = "Bugunlik hisobot kerak qoqon fliali bo'yicha";
    let posted = false;
    server.use(
      http.post("*/api/owner/ai/chats/:id/messages/", () => {
        posted = true;
        return HttpResponse.json({ code: "backend_unreachable", detail: "x" }, { status: 502 });
      }),
      http.get("*/api/owner/ai/chats/:id/messages/", () =>
        HttpResponse.json({
          has_more: false,
          oldest_id: 1,
          messages: [
            { id: 1, role: "user", text: "Salom", created_at: "2026-11-13T07:00:00Z" },
            { id: 2, role: "assistant", text: "Salom!", created_at: "2026-11-13T07:00:05Z" },
            ...(posted
              ? [
                  { id: 3, role: "user", text: question, created_at: "2026-11-13T07:05:53Z" },
                  {
                    id: 4,
                    role: "assistant",
                    text: "## Qo'qon — bugun\n\n| Ko'rsatkich | Qiymat |\n|---|---:|\n| Zakaz | 42 |",
                    created_at: "2026-11-13T07:06:14Z",
                  },
                ]
              : []),
          ],
        }),
      ),
    );
    await renderWithProviders(<AiScreen />, { searchParams: "?tab=chat&chat=3" });

    await user.type(await screen.findByLabelText(/Savolingizni yozing/), question);
    await user.click(screen.getByRole("button", { name: "Yuborish" }));
    expect(await screen.findByRole("heading", { name: "Qo'qon — bugun" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Qayta yuborish" })).not.toBeInTheDocument();
  });

  it("offers a resend only when the answer is really missing after the backend's 90 s", async () => {
    const user = userEvent.setup();
    const realNow = Date.now.bind(Date);
    server.use(
      http.post("*/api/owner/ai/chats/:id/messages/", () => {
        // uzilish 2 daqiqadan keyin bo'ldi — tiklanish bitta tekshiruv bilan tugaydi
        vi.spyOn(Date, "now").mockImplementation(() => realNow() + 200_000);
        return HttpResponse.json({ code: "backend_unreachable", detail: "x" }, { status: 502 });
      }),
    );
    await renderWithProviders(<AiScreen />, { searchParams: "?tab=chat&chat=3" });

    await user.type(await screen.findByLabelText(/Savolingizni yozing/), "Qaysi filial yaxshi?");
    await user.click(screen.getByRole("button", { name: "Yuborish" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/serverda ham saqlanmagan/);
    expect(screen.getByRole("button", { name: "Qayta yuborish" })).toBeInTheDocument();
  });

  it("names the rate limit clearly (429)", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/owner/ai/chats/:id/messages/", () =>
        HttpResponse.json({ code: "rate_limited", detail: "x" }, { status: 429 }),
      ),
    );
    await renderWithProviders(<AiScreen />, { searchParams: "?tab=chat&chat=3" });

    await user.type(await screen.findByLabelText(/Savolingizni yozing/), "Qaysi filial yaxshi?");
    await user.click(screen.getByRole("button", { name: "Yuborish" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Daqiqasiga savollar chegarasi \(10 ta\)/);
  });

  it("keyless mode: banner, chat history visible, writing disabled, findings kept", async () => {
    server.use(http.get("*/api/owner/ai/status/", () => HttpResponse.json({ enabled: false, model: null })));
    await renderWithProviders(<AiScreen />, { searchParams: "?tab=chat&chat=3" });

    expect(await screen.findByText(/AI kaliti hali qo'yilmagan/)).toBeInTheDocument();
    expect(await screen.findByText(/AI chat hozir mavjud emas/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Savolingizni yozing/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Atkaz nega oshdi?").length).toBeGreaterThan(0);
  });

  it("sends an AI draft only after confirmation", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AiScreen />, { searchParams: "?tab=drafts" });

    expect(screen.getByText(/AI xabarni hech qachon o'zi yubormaydi/)).toBeInTheDocument();
    const [send] = await screen.findAllByRole("button", { name: "Yuborish" });
    if (!send) throw new Error("no draft");
    await user.click(send);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/Bosh logist/);
    await user.click(within(dialog).getByRole("button", { name: "Yuborish" }));
    expect(await screen.findAllByRole("button", { name: "Yuborish" })).toHaveLength(1);
  });

  it("shows the monthly cost", async () => {
    await renderWithProviders(<AiScreen />, { searchParams: "?tab=usage&month=2026-10" });

    expect(await screen.findByText("Chaqiruvlar")).toBeInTheDocument();
    expect(screen.getByText("Daqiqasiga so'rov")).toBeInTheDocument();
  });

  it("works without the status endpoint (404): no pending note, all tabs", async () => {
    server.use(http.get("*/api/owner/ai/status/", () => new HttpResponse(null, { status: 404 })));
    await renderWithProviders(<AiScreen />);

    expect(await screen.findByText(FINDING)).toBeInTheDocument();
    expect(screen.queryByText(/kutilmoqda/)).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Chat/ })).toBeInTheDocument();
  });
});
