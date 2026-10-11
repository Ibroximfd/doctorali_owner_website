// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppError } from "@/shared/lib/app-error";
import { renderWithProviders } from "@/shared/testing/render";

import { QueryState } from "./query-state";

type Query = Parameters<typeof QueryState<string[]>>[0]["query"];

const query = (overrides: Partial<Query>): Query => ({
  data: undefined,
  error: null,
  isPending: false,
  isPlaceholderData: false,
  refetch: vi.fn(),
  ...overrides,
});

const renderState = (state: Query) =>
  renderWithProviders(
    <QueryState query={state} skeleton={<div data-testid="skeleton" />} isEmpty={(rows) => rows.length === 0}>
      {(rows) => (
        <ul>
          {rows.map((row) => (
            <li key={row}>{row}</li>
          ))}
        </ul>
      )}
    </QueryState>,
  );

describe("QueryState", () => {
  it("shows the skeleton on the first load", async () => {
    await renderState(query({ isPending: true }));

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("renders the content when data is ready", async () => {
    await renderState(query({ data: ["DA-184011"] }));

    expect(screen.getByText("DA-184011")).toBeInTheDocument();
  });

  it("shows the empty state when there is nothing to show", async () => {
    await renderState(query({ data: [] }));

    expect(screen.getByText("Bu davrda ma'lumot yo'q")).toBeInTheDocument();
  });

  it("shows a readable error with a retry that re-runs the same query", async () => {
    const refetch = vi.fn();
    await renderState(query({ error: new AppError("server"), refetch }));

    expect(screen.getByText("Serverda xatolik. Bir ozdan so'ng qayta urinib ko'ring.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Qayta urinish" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("explains a forbidden section instead of offering a retry", async () => {
    await renderState(query({ error: new AppError("forbidden") }));

    expect(screen.getByText("Bu bo'lim sizga ochilmagan")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Qayta urinish" })).not.toBeInTheDocument();
  });

  it("keeps the previous content dimmed while a filter change loads", async () => {
    await renderState(query({ data: ["DA-184011"], isPlaceholderData: true }));

    expect(screen.getByText("DA-184011").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
  });

  it("keeps stale content and says so when a refresh fails", async () => {
    await renderState(query({ data: ["DA-184011"], error: new AppError("offline") }));

    expect(screen.getByText("DA-184011")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Yangilab bo'lmadi");
  });
});
