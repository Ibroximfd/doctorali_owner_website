// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { server, useMockApi } from "@/shared/testing/server";

import { AiScreen } from "./ai-screen";

describe("AiScreen", () => {
  useMockApi();

  it("opens on the analysis: AI summary and findings grouped by severity", async () => {
    await renderWithProviders(<AiScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "AI tahlil" })).toBeInTheDocument();
    const panel = screen.getByRole("tabpanel");
    expect(
      await within(panel).findByText("Janub bosh kuryeri T2 ga pulni 3 kunda bir topshirmoqda"),
    ).toBeInTheDocument();
    expect(within(panel).getAllByRole("region", { name: "Shoshilinch" }).length).toBeGreaterThan(0);
    expect(within(panel).getByRole("region", { name: "Yaxshi" })).toBeInTheDocument();
    expect(
      within(panel).getByText("Janub skladida Kardiomed 24 dona qoldi (minimal 60)"),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Pul va sotuv joyida, lekin T2 orqada.")).toBeInTheDocument();
  });

  it("answers a chat question with its sources and period", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AiScreen />, { searchParams: "?tab=chat" });

    const tab = await screen.findByRole("tab", { name: "Chat" });
    expect(tab).toHaveAttribute("aria-selected", "true");
    await user.click(await screen.findByRole("button", { name: /Pul qayerda/ }));
    const conversation = screen.getByRole("region", { name: "AI bilan suhbat" });
    expect(await within(conversation).findByText(/Yetkazilgan zakazlardan .* tushdi/)).toBeInTheDocument();
    const sources = within(conversation).getByRole("list", { name: "Manba" });
    expect(within(sources).getByText("Moliya")).toBeInTheDocument();
    expect(within(conversation).getByText(/^Davr:/)).toBeInTheDocument();
  });

  it("explains a rate limit from the chat", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/owner/ai/chat/", () =>
        HttpResponse.json({ code: "too_many_attempts", detail: "x" }, { status: 429 }),
      ),
    );
    await renderWithProviders(<AiScreen />, { searchParams: "?tab=chat" });

    await user.type(await screen.findByLabelText(/Savolingizni yozing/), "Qaysi filial yaxshi?");
    await user.click(screen.getByRole("button", { name: "Yuborish" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("1 daqiqada ko'pi bilan 10 ta savol");
  });

  it("hides the chat when AI is disabled and keeps the analysis", async () => {
    server.use(http.get("*/api/owner/ai/status/", () => HttpResponse.json({ enabled: false, model: null })));
    await renderWithProviders(<AiScreen />, { searchParams: "?tab=chat" });

    expect(await screen.findByText(/AI chat o'chiq/)).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Chat" })).not.toBeInTheDocument();
    expect(
      await screen.findByText("Janub bosh kuryeri T2 ga pulni 3 kunda bir topshirmoqda"),
    ).toBeInTheDocument();
  });

  it("shows a pending note when the status endpoint does not exist yet (404)", async () => {
    server.use(http.get("*/api/owner/ai/status/", () => new HttpResponse(null, { status: 404 })));
    await renderWithProviders(<AiScreen />);

    expect(await screen.findByText(/AI holati backendda kutilmoqda/)).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Chat" })).not.toBeInTheDocument();
  });
});
