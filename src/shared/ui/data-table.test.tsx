// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DataTable, type Column } from "./data-table";

type Row = { id: string; name: string; amount: number };

const rows: Row[] = [
  { id: "a", name: "Toshkent", amount: 1306 },
  { id: "b", name: "Qo'qon", amount: 606 },
];

const columns: Column<Row>[] = [
  { id: "name", header: "Filial", primary: true, cell: (row) => row.name, footer: "Jami" },
  { id: "amount", header: "Tushum", align: "right", numeric: true, cell: (row) => row.amount, footer: 1912 },
];

describe("DataTable", () => {
  it("renders a real table with headers, rows and a totals row", () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />);

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Tushum" })).toBeInTheDocument();
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByText("1912")).toBeInTheDocument();
  });

  it("also renders the same rows as a card list for phones", () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />);

    const list = screen.getByRole("list");
    // 2 ta qator + jami kartasi
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    // sarlavha kartada yorliq sifatida takrorlanadi (2 qator + jami); asosiy ustun sarlavhasiz
    expect(within(list).getAllByText("Tushum")).toHaveLength(3);
    expect(within(list).queryByText("Filial")).not.toBeInTheDocument();
  });

  it("keeps the totals row on phones", () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />);

    const cards = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(cards).toHaveLength(3);
    expect(within(cards[2] as HTMLElement).getByText("Jami")).toBeInTheDocument();
    expect(within(cards[2] as HTMLElement).getByText("1912")).toBeInTheDocument();
  });

  it("makes rows operable by mouse and keyboard when clickable", async () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={onRowClick}
        rowLabel={(row) => row.name}
      />,
    );

    const [tableRow] = within(screen.getByRole("table")).getAllByRole("button", { name: "Toshkent" });
    await userEvent.click(tableRow as HTMLElement);
    (tableRow as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");

    expect(onRowClick).toHaveBeenCalledTimes(2);
    expect(onRowClick).toHaveBeenLastCalledWith(rows[0]);
  });

  it("marks selected rows as pressed toggles, in the table and in the cards", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={vi.fn()}
        rowLabel={(row) => row.name}
        isRowSelected={(row) => row.id === "b"}
      />,
    );

    for (const selected of screen.getAllByRole("button", { name: "Qo'qon" }))
      expect(selected).toHaveAttribute("aria-pressed", "true");
    for (const other of screen.getAllByRole("button", { name: "Toshkent" }))
      expect(other).toHaveAttribute("aria-pressed", "false");
  });

  it("leaves rows without a pressed state when selection is not used", () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} onRowClick={vi.fn()} />);

    for (const row of within(screen.getByRole("table")).getAllByRole("button"))
      expect(row).not.toHaveAttribute("aria-pressed");
  });

  it("renders rows without an id or with a repeated id without mixing them up", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const noIds = [
      { id: "null", name: "Toshkent", amount: 1 },
      { id: "null", name: "Qo'qon", amount: 2 },
      { id: "a", name: "Samarqand", amount: 3 },
      { id: "a", name: "Buxoro", amount: 4 },
    ];

    render(<DataTable columns={columns} rows={noIds} rowKey={(row) => row.id} />);

    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(6);
    expect(errors).not.toHaveBeenCalledWith(
      expect.stringContaining("same key"),
      expect.anything(),
      expect.anything(),
    );
    errors.mockRestore();
  });

  it("keeps the table on phones when asked (small tables)", () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} keepTableOnMobile />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
