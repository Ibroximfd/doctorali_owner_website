// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { RegionExplorer } from "./region-explorer";

describe("RegionExplorer", () => {
  useMockApi();

  it("drills into a region: couriers with their task and cash, warehouses with stock", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<RegionExplorer />);

    await user.click(await screen.findByRole("button", { name: /^Samarqand: / }));
    expect(await screen.findByRole("heading", { name: "Samarqand" })).toBeInTheDocument();
    expect((await screen.findAllByText(/DA-184011 ni yetkazmoqda/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/qo'lida/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("tab", { name: /Omborlar/ }));
    expect(await screen.findByText("Mehrigiyo balzami")).toBeInTheDocument();
    expect(screen.getByText("Kritik")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Butun xaritaga qaytish" }));
    expect(await screen.findByText("Eng e'tibor talab qiladigan hududlar:")).toBeInTheDocument();
  });

  it("switches the map metric", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<RegionExplorer />);
    await screen.findAllByRole("button", { name: /viloyatiga kirish/ });

    await user.click(screen.getByRole("button", { name: "Kuryerlar" }));
    expect(await screen.findByText("Kuryerlarida eng ko'p naqd turgan hududlar:")).toBeInTheDocument();
    const map = screen.getByRole("group", { name: "O'zbekiston viloyatlari" });
    expect(within(map).getByRole("button", { name: /Andijon: 1\/3 ishlayapti/ })).toBeInTheDocument();
  });
});
