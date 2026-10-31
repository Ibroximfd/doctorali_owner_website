// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductThumb, mediaUrl, productInitials } from "./product-thumb";

describe("productInitials", () => {
  it("takes two letters from the name, ignoring brackets and punctuation", () => {
    expect(productInitials("Hapwell-3 (Majun Al-shifo)")).toBe("H3");
    expect(productInitials("Alatoo bals, 1 shisha")).toBe("AB");
    expect(productInitials("Gepatofit")).toBe("GE");
    expect(productInitials("  ")).toBe("?");
  });
});

describe("mediaUrl", () => {
  it("routes backend /media/ through our own origin and drops foreign hosts", () => {
    expect(mediaUrl("/media/items/a.jpg")).toBe("/api/media/items/a.jpg");
    expect(mediaUrl("https://imorganic.uz/media/items/a.jpg?v=2")).toBe("/api/media/items/a.jpg?v=2");
    expect(mediaUrl("https://cdn.example.com/a.jpg")).toBeNull();
    expect(mediaUrl("")).toBeNull();
    expect(mediaUrl(null)).toBeNull();
  });
});

describe("ProductThumb", () => {
  it("falls back to initials when the image fails to load", () => {
    const { container } = render(<ProductThumb name="Ibuprofen" src="/media/items/x.jpg" />);
    const image = container.querySelector("img");
    if (!image) throw new Error("rasm yo'q");
    fireEvent.error(image);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("IB")).toBeInTheDocument();
  });
});
