// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";

import { PinPad } from "./pin-pad";

describe("PinPad", () => {
  it("hands over the PIN once the fourth digit is pressed and starts over", async () => {
    const onComplete = vi.fn();
    await renderWithProviders(<PinPad title="PIN" onComplete={onComplete} />);

    for (const digit of ["4", "0", "7"]) await userEvent.click(screen.getByRole("button", { name: digit }));
    expect(screen.getByRole("img")).toHaveAccessibleName("3 / 4 raqam kiritildi");
    expect(onComplete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "1" }));

    expect(onComplete).toHaveBeenCalledExactlyOnceWith("4071");
    expect(screen.getByRole("img")).toHaveAccessibleName("0 / 4 raqam kiritildi");
  });

  it("takes digits and backspace from the keyboard", async () => {
    const onComplete = vi.fn();
    await renderWithProviders(<PinPad title="PIN" onComplete={onComplete} />);

    await userEvent.keyboard("93{Backspace}0x24");

    expect(onComplete).toHaveBeenCalledExactlyOnceWith("9024");
  });

  it("erases the last digit", async () => {
    await renderWithProviders(<PinPad title="PIN" onComplete={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "5" }));
    await userEvent.click(screen.getByRole("button", { name: "Oxirgi raqamni o'chirish" }));

    expect(screen.getByRole("img")).toHaveAccessibleName("0 / 4 raqam kiritildi");
  });

  it("ignores input while the previous PIN is being checked", async () => {
    const onComplete = vi.fn();
    await renderWithProviders(<PinPad title="PIN" onComplete={onComplete} isBusy />);

    await userEvent.keyboard("1234");

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "1" })).toBeDisabled();
  });

  it("announces the error from the previous attempt", async () => {
    await renderWithProviders(
      <PinPad title="PIN" error="PIN noto'g'ri" note="Qolgan urinishlar: 3" onComplete={vi.fn()} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("PIN noto'g'ri");
    expect(screen.getByText("Qolgan urinishlar: 3")).toBeInTheDocument();
  });
});
