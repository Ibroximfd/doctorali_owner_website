// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { AiHighlights } from "./ai-highlights";

describe("AiHighlights", () => {
  useMockApi();

  it("gives the first summary point and the three most important findings", async () => {
    await renderWithProviders(<AiHighlights />);

    expect(await screen.findByText("Pul va sotuv joyida, lekin T2 orqada.")).toBeInTheDocument();
    expect(await screen.findAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "AI tahlilga o'tish" })).toHaveAttribute("href", "/ai");
  });
});
