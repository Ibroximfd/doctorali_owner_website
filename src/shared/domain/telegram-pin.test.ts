import { describe, expect, it } from "vitest";

import { isPinShaped, isWeakPin } from "./telegram-pin";

describe("telegram PIN rules", () => {
  it("accepts exactly four digits", () => {
    expect(isPinShaped("4071")).toBe(true);
    expect(isPinShaped("407")).toBe(false);
    expect(isPinShaped("40711")).toBe(false);
    expect(isPinShaped("40a1")).toBe(false);
  });

  it.each(["0000", "7777", "1234", "6789", "4321", "9876", "1212", "4545", "2580", "1004"])(
    "rejects the guessable %s",
    (pin) => expect(isWeakPin(pin)).toBe(true),
  );

  it.each(["4071", "9302", "1357", "8024"])("accepts %s", (pin) => expect(isWeakPin(pin)).toBe(false));

  it("treats anything that is not a PIN as weak", () => {
    expect(isWeakPin("12")).toBe(true);
    expect(isWeakPin("")).toBe(true);
  });
});
