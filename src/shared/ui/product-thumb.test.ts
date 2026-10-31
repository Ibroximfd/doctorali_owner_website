import { describe, expect, it } from "vitest";

import { productInitials } from "./product-thumb";

describe("productInitials", () => {
  it("takes two letters from the name, ignoring brackets and punctuation", () => {
    expect(productInitials("Hapwell-3 (Majun Al-shifo)")).toBe("H3");
    expect(productInitials("Alatoo bals, 1 shisha")).toBe("AB");
    expect(productInitials("Gepatofit")).toBe("GE");
    expect(productInitials("  ")).toBe("?");
  });
});
