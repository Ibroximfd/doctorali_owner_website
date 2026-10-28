"use client";

import { ChartLine, Table } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

import { Card, CardBody, CardHeader } from "./card";
import { ColumnChart, TrendChart, isChartEmpty, toChartTable, type ChartData } from "./charts";
import { EmptyState } from "./states";

type ChartCardProps = {
  title: string;
  description?: string;
  /** `trend` — chiziq, `columns` — ustma-ust ustunlar. */
  kind: "trend" | "columns";
  data: ChartData;
  formatValue: (value: number) => string;
  formatAxis?: (value: number) => string;
  /** Jadval ko'rinishidagi birinchi ustun sarlavhasi (odatda "Davr"). */
  columnLabel: string;
  /** Seriyalar qo'shiladigan bo'lsa — tooltipda jami. */
  showTotal?: boolean;
  /** Sarlavha yonidagi qo'shimcha element (havola). */
  action?: ReactNode;
  /** Grafik ostidagi kontent. */
  footer?: ReactNode;
  /** Balandlik klassi (`h-52 md:h-64`). */
  heightClassName?: string;
  className?: string;
};

type View = "chart" | "table";

/**
 * Grafik kartasi: sarlavha, legend (≥2 seriya), grafik ↔ jadval almashtirgich.
 * Jadval ko'rinishi — grafikning to'liq egizagi: har qiymat hoversiz o'qiladi.
 */
export const ChartCard = ({
  title,
  description,
  kind,
  data,
  formatValue,
  formatAxis,
  columnLabel,
  showTotal = false,
  action,
  footer,
  heightClassName = "h-52 md:h-64",
  className,
}: ChartCardProps) => {
  const t = useTranslations("common.chart");
  const [view, setView] = useState<View>("chart");
  const showLegend = data.series.length > 1 || Boolean(data.compare);
  const Chart = kind === "trend" ? TrendChart : ColumnChart;

  const toggle = (
    <div role="group" aria-label={t("view")} className="inline-flex overflow-hidden rounded-md border">
      {(["chart", "table"] as const).map((option) => {
        const Icon = option === "chart" ? ChartLine : Table;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            aria-label={t(option)}
            title={t(option)}
            onClick={() => setView(option)}
            className={cn(
              "grid h-6.5 w-7 place-items-center",
              view === option ? "bg-surface-3 text-ink" : "text-ink-3 hover:text-ink",
            )}
          >
            <Icon aria-hidden className="size-3.5" />
          </button>
        );
      })}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader
        title={title}
        description={description}
        action={
          <>
            {action}
            {toggle}
          </>
        }
      />
      <CardBody>
        {isChartEmpty(data) ? (
          <EmptyState />
        ) : view === "chart" ? (
          <>
            {showLegend ? (
              <ul className="text-ink-2 mb-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {data.series.map((series) => (
                  <li key={series.key} className="inline-flex items-center gap-1.5">
                    {/* rang — seriyaning o'z tokeni */}
                    <span
                      aria-hidden
                      className={cn(
                        "shrink-0",
                        kind === "trend" ? "h-0.5 w-3.5 rounded-full" : "size-2.5 rounded-xs",
                      )}
                      style={{ backgroundColor: series.color }}
                    />
                    {series.name}
                  </li>
                ))}
                {data.compare ? (
                  <li className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="bg-cmp h-0.5 w-3.5 shrink-0 rounded-full" />
                    {data.compare.name}
                  </li>
                ) : null}
              </ul>
            ) : null}
            <div className={heightClassName}>
              <Chart
                data={data}
                formatValue={formatValue}
                formatAxis={formatAxis}
                totalLabel={showTotal ? t("total") : undefined}
                ariaLabel={title}
              />
            </div>
          </>
        ) : (
          <ChartTableView data={data} columnLabel={columnLabel} formatValue={formatValue} />
        )}
        {footer ? <div className="mt-3.5">{footer}</div> : null}
      </CardBody>
    </Card>
  );
};

const ChartTableView = ({
  data,
  columnLabel,
  formatValue,
}: Pick<ChartCardProps, "data" | "columnLabel" | "formatValue">) => {
  const table = toChartTable(data, columnLabel, formatValue);

  return (
    <div className="max-h-72 overflow-auto rounded-md border">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {table.headers.map((header, index) => (
              <th
                key={header}
                scope="col"
                className={cn(
                  "bg-surface text-2xs text-ink-3 sticky top-0 border-b px-3 py-2 font-semibold whitespace-nowrap",
                  index === 0 ? "text-left" : "text-right",
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Yorliq takrorlanishi mumkin (yillar oralig'ida «Sen») — kalit tartib raqami. */}
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="group">
              {row.map((cell, index) => (
                <td
                  key={table.headers[index]}
                  className={cn(
                    "border-b px-3 py-2 whitespace-nowrap group-last:border-b-0",
                    index === 0 ? "text-left" : "num text-right text-xs",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
