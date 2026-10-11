// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";

import { MetricDelta } from "./metric-delta";

describe("MetricDelta", () => {
  it("renders nothing without a comparison", async () => {
    const { container } = await renderWithProviders(<MetricDelta value={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("marks growth as good and says the direction in words", async () => {
    await renderWithProviders(<MetricDelta value={10.6} />);

    const pill = screen.getByText(/10,6%/);
    expect(pill).toHaveClass("text-good");
    expect(pill).toHaveTextContent("o'sdi");
  });

  it("marks growth as bad for metrics where less is better", async () => {
    await renderWithProviders(<MetricDelta value={3.5} invert />);

    expect(screen.getByText(/3,5%/)).toHaveClass("text-crit");
  });

  it("uses percentage points for shares and stays neutral when flat", async () => {
    await renderWithProviders(
      <>
        <MetricDelta value={-0.8} unit="pp" invert />
        <MetricDelta value={0.01} />
      </>,
    );

    expect(screen.getByText(/0,8 f\.p\./)).toHaveClass("text-good");
    expect(screen.getByText(/0,0%/)).toHaveClass("text-ink-3");
  });
});
