"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { EmptyState, NoResults } from "@/shared/ui/states";

import { useRatingsView } from "../hooks/use-ratings";

type RatingListProps<Row> = {
  title: string;
  /** Server bergan qatorlar soni (filtrsiz) — bo'sh holatni «natija yo'q» dan ajratadi. */
  total: number;
  rows: readonly Row[];
  columns: readonly Column<Row>[];
  rowKey: (row: Row) => string;
  emptyTitle: string;
  emptyDescription: string;
  filters: ReactNode;
};

/**
 * Reyting ro'yxati: davrda umuman qator yo'q — «bo'sh» (sababi bilan); filtr hech narsa
 * topmadi — «topilmadi» + tozalash. Torda jadval kartalarga aylanadi (`DataTable`).
 */
export const RatingList = <Row,>({
  title,
  total,
  rows,
  columns,
  rowKey,
  emptyTitle,
  emptyDescription,
  filters,
}: RatingListProps<Row>) => {
  const t = useTranslations("ratings.list");
  const { filters: current, clearFilters } = useRatingsView();
  return (
    <Card>
      <CardHeader
        title={title}
        description={total > 0 ? t("shown", { shown: rows.length, total }) : undefined}
      />
      <CardBody flush>
        {total === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <>
            {filters}
            {rows.length === 0 ? (
              <NoResults query={current.q.trim() || undefined} onClear={clearFilters} />
            ) : (
              <DataTable columns={columns} rows={rows} rowKey={rowKey} />
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
};
