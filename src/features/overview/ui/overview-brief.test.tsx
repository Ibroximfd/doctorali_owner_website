// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { failNext, useMockApi } from "@/shared/testing/server";

import { FeedTicker } from "./feed-ticker";
import { OverviewBrief } from "./overview-brief";

describe("OverviewBrief", () => {
  useMockApi();

  it("writes the editorial headline from real numbers with a stable accessible name", async () => {
    await renderWithProviders(<OverviewBrief dateline="28-oktabr" />, { searchParams: "?period=30d" });

    const heading = await screen.findByRole("heading", { level: 1, name: /Bugungi holat\..*Bugun biznes/ });
    expect(heading).toHaveTextContent(/kritik signal|ochiq signal|Signal yo'q/);
    expect(await screen.findByText(/Davr tushumi/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /AI bilan gaplashish/ })).toHaveAttribute("href", "/ai");
  });

  it("keeps the h1 and offers a retry when the overview fails", async () => {
    failNext("overview/");
    await renderWithProviders(<OverviewBrief dateline="28-oktabr" />);

    expect(await screen.findByRole("button", { name: "Qayta urinish" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});

describe("FeedTicker", () => {
  useMockApi();

  it("reads every event once, the looping copy stays hidden", async () => {
    await renderWithProviders(<FeedTicker />);

    const ticker = await screen.findByRole("region", { name: "Oxirgi hodisalar" });
    await waitFor(() => expect(ticker.querySelectorAll("ul")).toHaveLength(2));
    const lists = ticker.querySelectorAll("ul");
    expect(lists[1]).toHaveAttribute("aria-hidden", "true");
    expect(lists[0]?.querySelectorAll("li").length).toBeGreaterThan(0);
  });
});
