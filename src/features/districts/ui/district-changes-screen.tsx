"use client";

import { ArrowRight, ChevronLeft, ChevronRight, EyeOff, History, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { REGION_TILES } from "@/shared/config/regions";
import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { useRegionName } from "@/shared/meta/use-region-name";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Chip } from "@/shared/ui/chip";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Field, Input, Select } from "@/shared/ui/input";
import { Pill } from "@/shared/ui/pill";
import { NoResults, QueryState, StateBlock, TableSkeleton } from "@/shared/ui/states";

import { useDistrictChangeFilters, useDistrictChangesQuery } from "../hooks/use-districts";
import { actionTone, hasFilters, isCustomDistrict, nameChange, pageRange } from "../model/districts.rules";
import {
  DISTRICT_CHANGES_PAGE_SIZE,
  JOURNAL_START,
  type DistrictChange,
  type FieldChange,
} from "../model/districts.schema";

const REGION_CODES = Object.keys(REGION_TILES);

/**
 * «Tumanlar tarixi» (bo'lim `logistics`): bosh kuryer yoki admin tuman ro'yxatiga kiritgan har
 * o'zgarish — qo'shish, nomini o'zgartirish, yashirish, qaytarish, tahrir. Owner faqat ko'radi.
 * Filtrlar URL da; ruxsat yo'q (`section_forbidden`) — `QueryState` ning «ochilmagan» holati.
 */
export const DistrictChangesScreen = () => {
  const t = useTranslations("districts");
  const query = useDistrictChangesQuery();
  const { filters, clear } = useDistrictChangeFilters();

  return (
    <Card>
      <CardHeader title={t("listTitle")} description={t("journalNote", { date: JOURNAL_START })} />
      <CardBody flush>
        <Filters />
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={8} className="px-5" />}
          isEmpty={(data) => data.count === 0}
          empty={
            hasFilters(filters) ? (
              <NoResults onClear={clear} />
            ) : (
              <StateBlock
                icon={History}
                title={t("emptyTitle")}
                description={t("emptyDescription", { date: JOURNAL_START })}
              />
            )
          }
        >
          {(data) => (
            <>
              <ChangesTable rows={data.results} />
              <Pagination count={data.count} />
            </>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};

const Filters = () => {
  const t = useTranslations("districts.filters");
  const regionName = useRegionName();
  const { filters, setFilter, clear } = useDistrictChangeFilters();
  // tanlangan tuman nomi — joriy sahifadagi yozuvlardan (shu so'rov keshidan, qo'shimcha so'rov yo'q)
  const rows = useDistrictChangesQuery().data?.results ?? [];
  const districtName =
    rows.find((row) => row.district.code === filters.district)?.district.nameUz || filters.district;
  const textOrNull = (value: string) => (value === "" ? null : value);

  return (
    <div
      role="search"
      aria-label={t("label")}
      className="grid grid-cols-2 gap-2.5 px-4 pb-3 sm:grid-cols-3 md:px-5.5 lg:grid-cols-4"
    >
      <Field id="dc-region" label={t("region")} className="col-span-2 sm:col-span-1">
        <Select
          id="dc-region"
          value={filters.region ?? ""}
          // tuman viloyatga tegishli — viloyat almashsa tuman filtri tushadi
          onChange={(event) => setFilter({ region: textOrNull(event.target.value), district: null })}
        >
          <option value="">{t("allRegions")}</option>
          {REGION_CODES.map((code) => (
            <option key={code} value={code}>
              {regionName(code)}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="dc-from" label={t("from")}>
        <Input
          id="dc-from"
          type="date"
          value={filters.from ?? ""}
          min={JOURNAL_START}
          max={filters.to ?? undefined}
          onChange={(event) => setFilter({ from: textOrNull(event.target.value) })}
        />
      </Field>
      <Field id="dc-to" label={t("to")}>
        <Input
          id="dc-to"
          type="date"
          value={filters.to ?? ""}
          min={filters.from ?? JOURNAL_START}
          onChange={(event) => setFilter({ to: textOrNull(event.target.value) })}
        />
      </Field>
      <div className="col-span-2 flex flex-wrap items-end gap-2 sm:col-span-3 lg:col-span-1">
        {filters.district ? (
          <Chip pressed onClick={() => setFilter({ district: null })} aria-label={t("districtClear")}>
            {t("district", { name: districtName ?? "" })}
            <X aria-hidden className="size-3" />
          </Chip>
        ) : (
          <p className="text-2xs text-ink-3">{t("districtHint")}</p>
        )}
        {hasFilters(filters) ? (
          <Button size="sm" intent="ghost" className="ms-auto" onClick={clear}>
            {t("clear")}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

const useLabels = () => {
  const t = useTranslations("districts");
  return {
    action: (action: string) => (t.has(`actions.${action}`) ? t(`actions.${action}`) : action),
    source: (source: string) => (t.has(`sources.${source}`) ? t(`sources.${source}`) : source),
    field: (field: string) => (t.has(`fields.${field}`) ? t(`fields.${field}`) : field),
    value: (value: FieldChange["old"]) =>
      value === null ? "—" : typeof value === "boolean" ? t(value ? "visible" : "hiddenValue") : value,
  };
};

const ChangesTable = ({ rows }: { rows: readonly DistrictChange[] }) => {
  const t = useTranslations("districts");
  const format = useFormat();
  const labels = useLabels();
  const regionName = useRegionName();
  const { setFilter } = useDistrictChangeFilters();

  const columns: Column<DistrictChange>[] = [
    {
      id: "at",
      header: t("columns.at"),
      cell: (row) => <span className="num text-ink-2 whitespace-nowrap">{format.dateTime(row.at)}</span>,
    },
    {
      id: "district",
      header: t("columns.district"),
      primary: true,
      cell: (row) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="hover:text-accent focus-visible:ring-accent rounded-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
            aria-label={t("filterByDistrict", { name: row.district.nameUz || row.district.code })}
            onClick={() => setFilter({ district: row.district.code, region: row.region || null })}
          >
            {row.district.nameUz || row.district.code}
          </button>
          {isCustomDistrict(row) ? <Pill intent="info">{t("customBadge")}</Pill> : null}
          {row.district.isActive ? null : (
            <Pill intent="warn" icon={EyeOff}>
              {t("hiddenBadge")}
            </Pill>
          )}
        </span>
      ),
    },
    {
      id: "region",
      header: t("columns.region"),
      cell: (row) => row.regionName ?? (row.region ? regionName(row.region) : "—"),
    },
    {
      id: "action",
      header: t("columns.action"),
      cell: (row) => <Pill intent={actionTone(row.action)}>{labels.action(row.action)}</Pill>,
    },
    {
      id: "name",
      header: t("columns.name"),
      cell: (row) => <NameChange row={row} />,
    },
    {
      id: "changes",
      header: t("columns.changes"),
      cell: (row) => <FieldChanges changes={row.changes} />,
    },
    {
      id: "actor",
      header: t("columns.actor"),
      cell: (row) => (
        <span>
          {row.actor?.name || t("unknownActor")}
          {row.source ? <span className="text-ink-3 text-xs"> · {labels.source(row.source)}</span> : null}
        </span>
      ),
    },
  ];

  return <DataTable columns={columns} rows={rows} rowKey={(row) => String(row.id)} />;
};

const NameChange = ({ row }: { row: DistrictChange }) => {
  const t = useTranslations("districts");
  const change = nameChange(row);
  if (!change) return <span className="text-ink-3">—</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="text-ink-3 line-through">{change.from ?? "—"}</span>
      <ArrowRight aria-label={t("arrow")} className="text-ink-3 size-3.5" />
      <span className="font-semibold">{change.to ?? "—"}</span>
    </span>
  );
};

/** Maydonlar ro'yxati yig'ilgan holda (`<details>` — klaviatura va ekran o'quvchi bilan ishlaydi). */
const FieldChanges = ({ changes }: { changes: readonly FieldChange[] }) => {
  const t = useTranslations("districts");
  const labels = useLabels();
  if (changes.length === 0) return <span className="text-ink-3">—</span>;
  return (
    <details className="group text-sm">
      <summary className="text-accent cursor-pointer text-xs font-semibold">
        {t("fieldsCount", { count: changes.length })}
      </summary>
      <ul className="mt-1.5 flex flex-col gap-1">
        {changes.map((change) => (
          <li key={change.field} className="text-xs">
            <span className="text-ink-3">{labels.field(change.field)}: </span>
            <span className="text-ink-3 line-through">{labels.value(change.old)}</span>
            <span className="text-ink-3"> → </span>
            <span className="font-semibold">{labels.value(change.new)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
};

const Pagination = ({ count }: { count: number }) => {
  const t = useTranslations("districts.pagination");
  const { filters, setPage } = useDistrictChangeFilters();
  const range = pageRange(filters.page, DISTRICT_CHANGES_PAGE_SIZE, count);
  return (
    <nav aria-label={t("label")} className="flex items-center gap-2 border-t px-4 py-3 md:px-5.5">
      <span className="num text-ink-3 text-xs">
        {t("range", {
          from: formatNumber(range.from),
          to: formatNumber(range.to),
          count: formatNumber(count),
        })}
      </span>
      <Button
        size="icon"
        intent="ghost"
        className="ml-auto"
        aria-label={t("prev")}
        disabled={filters.page <= 1}
        onClick={() => setPage(filters.page - 1)}
      >
        <ChevronLeft aria-hidden />
      </Button>
      <span className="num text-xs">{t("page", { page: filters.page, pages: range.pages })}</span>
      <Button
        size="icon"
        intent="ghost"
        aria-label={t("next")}
        disabled={filters.page >= range.pages}
        onClick={() => setPage(filters.page + 1)}
      >
        <ChevronRight aria-hidden />
      </Button>
    </nav>
  );
};
