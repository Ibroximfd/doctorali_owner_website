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

  it("ranks operators from sales/operators by sales, best first", async () => {
    await renderWithProviders(<StaffScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "Xodimlar nazorati" })).toBeInTheDocument();
    const board = card("Reyting");
    expect((await within(board).findAllByText("Dilnoza Karimova")).length).toBeGreaterThan(0);
    expect(within(board).getAllByText("Sotuv summasi").length).toBeGreaterThan(0);
    // jamoa = filial
    expect(screen.getByRole("button", { name: /Toshkent 2/ })).toBeInTheDocument();
  });

  it("opens an operator profile compared with the filial team", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<StaffScreen />);

    const board = card("Reyting");
    const [row] = await within(board).findAllByRole("button", { name: "Dilnoza Karimova profilini ochish" });
    if (!row) throw new Error("qator yo'q");
    await user.click(row);
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Jamoa o'rtachasi bilan")).toBeInTheDocument();
  });

  it("marks logists as waiting for the backend", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<StaffScreen />);

    await user.click(screen.getByRole("tab", { name: "Logistlar" }));
    expect((await screen.findAllByText(/backend/i)).length).toBeGreaterThan(0);
  });

  it("puts the best three on the podium", async () => {
    await renderWithProviders(<StaffScreen />);

    const podium = await screen.findByRole("region", { name: "Eng yaxshi uchlik" });
    expect(await within(podium).findByText("Dilnoza Karimova")).toBeInTheDocument();
    expect(within(podium).getAllByRole("listitem")).toHaveLength(3);
  });
});
