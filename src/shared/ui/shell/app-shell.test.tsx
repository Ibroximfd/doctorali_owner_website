// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { AppShell } from "./app-shell";

const navigation = vi.hoisted(() => ({ pathname: "/orders", push: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push, refresh: vi.fn() }),
}));

const renderShell = (searchParams = "", onLogout = vi.fn()) =>
  renderWithProviders(
    <AppShell alertsCount={9} userName="Boshliq" userRole="Egasi · faqat ko'rish" onLogout={onLogout}>
      <p>kontent</p>
    </AppShell>,
    { searchParams },
  );

describe("AppShell", () => {
  useMockApi();

  beforeEach(() => {
    navigation.pathname = "/orders";
    navigation.push.mockReset();
  });

  it("marks the current section and shows the open alerts count", async () => {
    await renderShell();

    const nav = screen.getByRole("navigation", { name: "Bo'limlar" });
    expect(within(nav).getByRole("link", { name: /Buyurtmalar/ })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: /Umumiy/ })).not.toHaveAttribute("aria-current");
    expect(within(nav).getByRole("link", { name: /Signallar/ })).toHaveTextContent("9");
    expect(screen.getByText("kontent")).toBeInTheDocument();
  });

  it("carries the chosen period and filial from section to section", async () => {
    await renderShell("?period=7d&filial=2");

    const nav = screen.getByRole("navigation", { name: "Bo'limlar" });
    expect(within(nav).getByRole("link", { name: /Moliya/ })).toHaveAttribute(
      "href",
      "/finance?period=7d&filial=2",
    );
  });

  it("offers the phone tab bar with the remaining sections behind 'Yana'", async () => {
    await renderShell();

    const tabs = screen.getByRole("navigation", { name: "Tezkor o'tish" });
    expect(within(tabs).getAllByRole("link")).toHaveLength(4);

    await userEvent.click(within(tabs).getByRole("button", { name: "Yana" }));
    const sheet = await screen.findByRole("dialog", { name: "Boshqa bo'limlar" });
    expect(within(sheet).getByRole("link", { name: "Klinika" })).toBeInTheDocument();
    expect(within(sheet).queryByRole("link", { name: "Moliya" })).not.toBeInTheDocument();
  });

  it("hides the period filter on pages that do not depend on it", async () => {
    navigation.pathname = "/settings";
    await renderShell();

    expect(screen.queryByRole("group", { name: "Davr" })).not.toBeInTheDocument();
  });

  it("opens search with the keyboard and jumps to a section, keeping the chosen period", async () => {
    await renderShell("?period=7d");

    await userEvent.keyboard("{Meta>}k{/Meta}");
    const palette = await screen.findByRole("dialog", { name: "Qidirish" });
    await userEvent.type(within(palette).getByRole("combobox"), "Moliya");
    await userEvent.keyboard("{Enter}");

    expect(navigation.push).toHaveBeenCalledWith("/finance?period=7d");
  });

  it("turns a free-text query into an orders search", async () => {
    await renderShell();

    await userEvent.click(screen.getAllByRole("button", { name: "Qidirish" })[0] as HTMLElement);
    const palette = await screen.findByRole("dialog", { name: "Qidirish" });
    await userEvent.type(within(palette).getByRole("combobox"), "DA-184011");
    await userEvent.click(within(palette).getByText("Buyurtmalardan qidirish: «DA-184011»"));

    expect(navigation.push).toHaveBeenCalledWith("/orders?q=DA-184011");
  });

  it("signs the owner out from the top bar", async () => {
    const onLogout = vi.fn();
    await renderShell("", onLogout);

    await userEvent.click(screen.getByRole("button", { name: "Chiqish" }));

    expect(onLogout).toHaveBeenCalledOnce();
  });
});
