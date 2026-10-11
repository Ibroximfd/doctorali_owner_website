import type { KeyboardEvent, ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

export type Column<Row> = {
  id: string;
  header: string;
  cell: (row: Row, index: number) => ReactNode;
  align?: "left" | "right";
  /** Raqamli ustun — bir xil kenglikdagi raqamlar. */
  numeric?: boolean;
  /** Telefondagi kartada sarlavhasiz, to'liq kenglikda birinchi qator. */
  primary?: boolean;
  /** Pastki "Jami" qatoridagi qiymat. */
  footer?: ReactNode;
};

type DataTableProps<Row> = {
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row, index: number) => string;
  /** Berilsa qator bosiladigan bo'ladi (klaviatura bilan ham). */
  onRowClick?: (row: Row) => void;
  /** Bosiladigan qatorning nomi (ekran o'quvchi uchun). */
  rowLabel?: (row: Row) => string;
  /** Qator "tanlangan" (almashtiruvchi tugma kabi): fon bilan ajratiladi va `aria-pressed` oladi. */
  isRowSelected?: (row: Row) => boolean;
  /** Telefonda kartalar o'rniga jadval qolsin (2–3 ustunli kichik jadvallar). */
  keepTableOnMobile?: boolean;
  className?: string;
};

const activateOnKey = (event: KeyboardEvent, activate: () => void) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  activate();
};

/**
 * Ustunlar — ma'lumot. Desktopda jadval, telefonda xuddi shu ustunlardan
 * yig'ilgan kartalar ro'yxati (gorizontal aylantirish o'rniga).
 */
/**
 * Qator kalitlari: backend id si bo'lmasa (`null`) yoki takrorlansa tartib raqami
 * qo'shiladi — React qatorlarni chalkashtirmasin.
 */
const uniqueRowKeys = <Row,>(rows: readonly Row[], rowKey: (row: Row, index: number) => string): string[] => {
  const used = new Set<string>();
  return rows.map((row, index) => {
    const raw = rowKey(row, index);
    const key =
      raw === "null" || raw === "undefined" || raw === "" || used.has(raw) ? `${raw}#${index}` : raw;
    used.add(key);
    return key;
  });
};

export const DataTable = <Row,>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowLabel,
  isRowSelected,
  keepTableOnMobile = false,
  className,
}: DataTableProps<Row>) => {
  const hasFooter = columns.some((column) => column.footer !== undefined);
  const keys = uniqueRowKeys(rows, rowKey);
  const interactive = (row: Row) =>
    onRowClick
      ? {
          role: "button" as const,
          tabIndex: 0,
          "aria-label": rowLabel?.(row),
          "aria-pressed": isRowSelected ? isRowSelected(row) : undefined,
          onClick: () => onRowClick(row),
          onKeyDown: (event: KeyboardEvent) => activateOnKey(event, () => onRowClick(row)),
        }
      : {};

  return (
    <div className={className}>
      <div className={cn("overflow-x-auto", !keepTableOnMobile && "max-md:hidden")}>
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(
                    "text-2xs text-ink-3 border-b px-2.5 py-2 font-semibold tracking-wider whitespace-nowrap uppercase first:pl-4.5 last:pr-4.5",
                    column.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={keys[index]}
                className={cn(
                  "group",
                  onRowClick && "hover:bg-surface-2 cursor-pointer",
                  isRowSelected?.(row) && "bg-accent-soft hover:bg-accent-soft",
                )}
                {...interactive(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      "border-b px-2.5 py-2.5 align-middle whitespace-nowrap group-last:border-b-0 first:pl-4.5 last:pr-4.5",
                      column.align === "right" && "text-right",
                      column.numeric && "num text-xs",
                    )}
                  >
                    {column.cell(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {hasFooter ? (
            <tfoot>
              <tr>
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      "border-border-strong font-strong border-t px-2.5 py-2.5 whitespace-nowrap first:pl-4.5 last:pr-4.5",
                      column.align === "right" && "text-right",
                      column.numeric && "num text-xs",
                    )}
                  >
                    {column.footer}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {keepTableOnMobile ? null : (
        <ul className="md:hidden">
          {rows.map((row, index) => (
            <li
              key={keys[index]}
              className={cn(
                "grid grid-cols-2 gap-x-3.5 gap-y-2 border-b px-3.5 py-3 last:border-b-0",
                onRowClick && "active:bg-surface-2 cursor-pointer",
                isRowSelected?.(row) && "bg-accent-soft",
              )}
              {...interactive(row)}
            >
              {columns.map((column) => (
                <div key={column.id} className={cn("min-w-0 text-sm", column.primary && "col-span-2")}>
                  {column.primary ? null : (
                    <div className="text-2xs text-ink-3 mb-0.5 font-semibold tracking-wider uppercase">
                      {column.header}
                    </div>
                  )}
                  <div className={cn(column.numeric && "num text-xs")}>{column.cell(row, index)}</div>
                </div>
              ))}
            </li>
          ))}
          {/* Jami qatori telefonda ham: aks holda yig'indi faqat katta ekranda ko'rinadi. */}
          {hasFooter ? (
            <li className="bg-surface-2 grid grid-cols-2 gap-x-3.5 gap-y-2 px-3.5 py-3 font-semibold">
              {columns.map((column) =>
                column.footer === undefined ? null : (
                  <div key={column.id} className={cn("min-w-0 text-sm", column.primary && "col-span-2")}>
                    {column.primary ? null : (
                      <div className="text-2xs text-ink-3 mb-0.5 font-semibold tracking-wider uppercase">
                        {column.header}
                      </div>
                    )}
                    <div className={cn(column.numeric && "num text-xs")}>{column.footer}</div>
                  </div>
                ),
              )}
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
};
