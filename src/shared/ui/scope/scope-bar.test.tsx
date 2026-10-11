// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { MobileScope, ScopeBar } from "./scope-bar";

describe("ScopeBar", () => {
  useMockApi();

  it("starts on the last 30 days for all filials, compared with the previous period", async () => {
    await renderWithProviders(<ScopeBar />);

    const periods = screen.getByRole("group", { name: "Davr" });
    expect(within(periods).getByRole("button", { name: "30 kun" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Barcha filiallar/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Oldingi davr bilan/ })).toBeInTheDocument();
  });

  it("switches the period", async () => {
    await renderWithProviders(<ScopeBar />);

    await userEvent.click(screen.getByRole("button", { name: "7 kun" }));

    expect(screen.getByRole("button", { name: "7 kun" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "30 kun" })).toHaveAttribute("aria-pressed", "false");
  });

  it("lets the owner pick one or several filials from the server list", async () => {
    await renderWithProviders(<ScopeBar />);

    await userEvent.click(screen.getByRole("button", { name: /Barcha filiallar/ }));
    await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Qo'qon" }));
    expect(screen.getByRole("button", { name: /Qo'qon/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Toshkent" }));
    expect(screen.getByRole("button", { name: /2 ta filial/ })).toBeInTheDocument();
  });

  it("shows a previously chosen month range instead of the generic label", async () => {
    await renderWithProviders(<ScopeBar />, { searchParams: "?period=prev_month" });

    expect(screen.getByRole("button", { name: /O'tgan oy/ })).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "Davr" })).getByRole("button", { name: "30 kun" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("applies a custom range only when both dates are valid", async () => {
    await renderWithProviders(<ScopeBar />);

    await userEvent.click(screen.getByRole("button", { name: /Oraliq/ }));
    const apply = await screen.findByRole("button", { name: "Qo'llash" });
    expect(apply).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Boshlanish sanasi"), "2026-09-01");
    await userEvent.type(screen.getByLabelText("Tugash sanasi"), "2026-09-30");
    expect(apply).toBeEnabled();
    await userEvent.click(apply);

    expect(await screen.findByRole("button", { name: /01\.09\.2026 – 30\.09\.2026/ })).toBeInTheDocument();
  });

  it("turns comparison off", async () => {
    await renderWithProviders(<ScopeBar />);

    await userEvent.click(screen.getByRole("button", { name: /Oldingi davr bilan/ }));
    await userEvent.click(await screen.findByRole("menuitemradio", { name: "Taqqoslashsiz" }));

    expect(screen.getByRole("button", { name: /Taqqoslashsiz/ })).toBeInTheDocument();
  });
});

describe("MobileScope", () => {
  useMockApi();

  it("summarises the filter on one button and edits it in a sheet", async () => {
    await renderWithProviders(<MobileScope />);

    await userEvent.click(screen.getByRole("button", { name: /30 kun · Barcha filiallar/ }));
    const sheet = await screen.findByRole("dialog", { name: "Filtr" });
    await userEvent.click(within(sheet).getByRole("button", { name: "Bugun" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Tayyor" }));

    expect(await screen.findByRole("button", { name: /Bugun · Barcha filiallar/ })).toBeInTheDocument();
  });
});
