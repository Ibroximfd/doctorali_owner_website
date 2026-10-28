// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { useMockApi } from "@/shared/testing/server";

import { SystemScreen } from "./system-screen";

describe("SystemScreen", () => {
  useMockApi();

  it("shows overall status, broken components first and sync errors", async () => {
    await renderWithProviders(<SystemScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "Tizim holati" })).toBeInTheDocument();
    expect(await screen.findAllByText("Sekinlashgan")).not.toHaveLength(0);
    expect(screen.getByText("Provayder 503 qaytardi")).toBeInTheDocument();
    expect(await screen.findByText("Telefon raqami noto'g'ri")).toBeInTheDocument();
    expect(await screen.findAllByText("Sardor Aliyevga Telegram orqali xabar")).not.toHaveLength(0);
  });
});
