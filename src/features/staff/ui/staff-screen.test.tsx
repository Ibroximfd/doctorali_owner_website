// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { StaffScreen } from "./staff-screen";

const card = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`"${title}" kartasi topilmadi`);
  return section;
};

describe("StaffScreen", () => {
  useMockApi();

  it("ranks operators with conversion and cancel rate, best first", async () => {
    await renderWithProviders(<StaffScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "Xodimlar reytingi" })).toBeInTheDocument();
    const board = card("Reyting");
    expect((await within(board).findAllByText("Dilnoza Karimova")).length).toBeGreaterThan(0);
    expect(within(board).getAllByText("Konversiya").length).toBeGreaterThan(0);
    expect(within(board).getAllByText("ma'lumot kam").length).toBeGreaterThan(0);
  });

  it("switches to couriers and opens a profile with ratings", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<StaffScreen />);

    await user.click(screen.getByRole("tab", { name: "Kuryerlar" }));
    const board = card("Reyting");
    expect((await within(board).findAllByText("Jasur Karimov")).length).toBeGreaterThan(0);

    const [row] = within(board).getAllByRole("button", { name: "Jasur Karimov profilini ochish" });
    if (!row) throw new Error("qator yo'q");
    await user.click(row);
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Mijoz baholari")).toBeInTheDocument();
    expect(within(dialog).getByText("Juda xushmuomala", { exact: false })).toBeInTheDocument();
  });

  it("puts the best three on the podium and explains the leader in the hero", async () => {
    await renderWithProviders(<StaffScreen />);

    const podium = await screen.findByRole("region", { name: "Eng yaxshi uchlik" });
    expect(await within(podium).findByText("Dilnoza Karimova")).toBeInTheDocument();
    expect(within(podium).getAllByRole("listitem")).toHaveLength(3);
    expect(await screen.findByText(/jamoa o'rtachasidan/)).toBeInTheDocument();
  });
});
