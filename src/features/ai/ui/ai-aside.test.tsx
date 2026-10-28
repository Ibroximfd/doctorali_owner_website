// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { TEST_NOW } from "@/shared/testing/mock-api";
import { useMockApi } from "@/shared/testing/server";

import { AiAside } from "./ai-aside";
import { AiOrb } from "./ai-orb";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

describe("AiAside", () => {
  useMockApi();

  // Namuna "hozir" i qat'iy — bekor qilish muddati shu soatga nisbatan. Taymerlar haqiqiy.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TEST_NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("shows the pending fix as a before → after diff and approves it", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AiAside />);

    const card = (
      await screen.findByRole("heading", { name: "Samarqanddagi 6 ta buyurtmani kuryerlarga biriktirish" })
    ).closest("article");
    if (!card) throw new Error("karta yo'q");
    expect(within(card).getByText("Tasdiq kerak")).toBeInTheDocument();
    const diff = within(card).getByRole("list", { name: "O'zgarishlar: oldin va keyin" });
    expect(within(diff).getByText("kuryer yo'q")).toBeInTheDocument();
    expect(within(diff).getByText("Jasur Karimov")).toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: "Tasdiqlash" }));
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Tasdiqlandi — bajarilmoqda"));
  });

  it("lists auto fixes with undo and findings with confidence bars", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AiAside />);

    expect(await screen.findByText("bugun 11 tasi avtomatik")).toBeInTheDocument();
    const fix = (await screen.findByText("3 ta buyurtmada viloyat tuzatildi")).closest("li");
    if (!fix) throw new Error("qator yo'q");
    await user.click(within(fix).getByRole("button", { name: "Bekor qilish" }));
    await vi.waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Bekor qilindi — avvalgi holat qaytarildi"),
    );

    expect(await screen.findByRole("meter", { name: "Ishonch: 86%" })).toHaveAttribute("aria-valuenow", "86");
  });
});

describe("AiOrb", () => {
  it("is decorative only", () => {
    render(<AiOrb thinking />);
    expect(screen.getByTestId("ai-orb")).toHaveAttribute("aria-hidden", "true");
  });
});
