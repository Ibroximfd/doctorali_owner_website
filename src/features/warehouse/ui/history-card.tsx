"use client";

import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { useTranslations } from "next-intl";

import { REGION_TILES } from "@/shared/config/regions";
import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { useRegionName } from "@/shared/meta/use-region-name";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Drawer, DrawerSection } from "@/shared/ui/drawer";
import { Field, Input, Select } from "@/shared/ui/input";
import { KvList } from "@/shared/ui/kv-list";
import { ProductThumb } from "@/shared/ui/product-thumb";
import { NoResults, QueryState, StateBlock, TableSkeleton } from "@/shared/ui/states";

import { LEDGER_PAGE_SIZE } from "../api/warehouse.api";
import {
  useDocumentQuery,
  useItemImages,
  useItemsQuery,
  useLedgerFilters,
  useLedgerQuery,
  useSkladsQuery,
  useWarehouseDialogs,
} from "../hooks/use-warehouse";
import { pageRange } from "../model/warehouse.rules";
import { ACTOR_KINDS, MOVEMENT_TYPES, type LedgerEntry, type SkladDocument } from "../model/warehouse.schema";

const REGION_CODES = Object.keys(REGION_TILES);

/**
 * Sklad daftari (`GET ledger/`, TZ 18 §3.5): har harakat — qo'lda (kirim, chiqim, tuzatish, kuryerga
 * berish, qabul) va avtomatik (sotuv, sovg'a, ball). Istalgan sana oralig'i, viloyat, mahsulot va tur
 * bo'yicha (URL da), sahifalab. Qator — hujjat (`documents/{id}/`). «Kim» bo'yicha filtr API da yo'q.
 */
export const HistoryCard = ({ className }: { className?: string }) => {
  const t = useTranslations("warehouse.history");
  const query = useLedgerQuery();
  const { isFiltered, clear } = useLedgerFilters();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody flush>
        <Filters />
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={10} className="px-5" />}
          isEmpty={(data) => data.count === 0}
          empty={
            isFiltered ? (
              <NoResults onClear={clear} />
            ) : (
              <StateBlock icon={History} title={t("emptyTitle")} description={t("emptyDescription")} />
            )
          }
        >
          {(data) => (
            <>
              <LedgerTable rows={data.results} />
              <Pagination count={data.count} />
            </>
          )}
        </QueryState>
      </CardBody>
      <EntryDrawer rows={query.data?.results ?? []} />
    </Card>
  );
};

const Filters = () => {
  const t = useTranslations("warehouse.history");
  const regionName = useRegionName();
  const items = useItemsQuery().data ?? [];
  const sklads = useSkladsQuery().data ?? [];
  const { filters, setFilter, isFiltered, clear } = useLedgerFilters();
  const textOrNull = (value: string) => (value === "" ? null : value);

  return (
    <div
      role="search"
      aria-label={t("filters")}
      className="grid grid-cols-2 gap-2.5 px-4 pb-3 sm:grid-cols-3 md:px-5.5 lg:grid-cols-7"
    >
      <Field id="h-from" label={t("from")}>
        <Input
          id="h-from"
          type="date"
          value={filters.from ?? ""}
          max={filters.to ?? undefined}
          onChange={(event) => setFilter({ hFrom: textOrNull(event.target.value) })}
        />
      </Field>
      <Field id="h-to" label={t("to")}>
        <Input
          id="h-to"
          type="date"
          value={filters.to ?? ""}
          min={filters.from ?? undefined}
          onChange={(event) => setFilter({ hTo: textOrNull(event.target.value) })}
        />
      </Field>
      <Field id="h-region" label={t("region")}>
        <Select
          id="h-region"
          value={filters.region ?? ""}
          onChange={(event) => setFilter({ hRegion: textOrNull(event.target.value) })}
        >
          <option value="">{t("all")}</option>
          {REGION_CODES.map((code) => (
            <option key={code} value={code}>
              {regionName(code)}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="h-sklad" label={t("sklad")}>
        <Select
          id="h-sklad"
          value={filters.sklad ?? ""}
          onChange={(event) =>
            setFilter({ hSklad: event.target.value === "" ? null : Number(event.target.value) })
          }
        >
          <option value="">{t("all")}</option>
          {sklads.map((sklad) => (
            <option key={sklad.id} value={sklad.id}>
              {sklad.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="h-item" label={t("item")}>
        <Select
          id="h-item"
          value={filters.item ?? ""}
          onChange={(event) =>
            setFilter({ hItem: event.target.value === "" ? null : Number(event.target.value) })
          }
        >
          <option value="">{t("all")}</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="h-actor" label={t("actor")}>
        <Select
          id="h-actor"
          value={filters.actor ?? ""}
          onChange={(event) => setFilter({ hActor: textOrNull(event.target.value) })}
        >
          <option value="">{t("all")}</option>
          {ACTOR_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`actors.${kind}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="h-type" label={t("type")}>
        <Select
          id="h-type"
          value={filters.type ?? ""}
          onChange={(event) => setFilter({ hType: textOrNull(event.target.value) })}
        >
          <option value="">{t("all")}</option>
          {MOVEMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`types.${type}`)}
            </option>
          ))}
        </Select>
      </Field>
      {isFiltered ? (
        <div className="col-span-2 sm:col-span-3 lg:col-span-7">
          <Button size="sm" intent="ghost" onClick={clear}>
            {t("clear")}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

const useLabels = () => {
  const t = useTranslations("warehouse.history");
  return {
    type: (type: string) => (t.has(`types.${type}`) ? t(`types.${type}`) : type),
    actor: (kind: string) => (t.has(`actors.${kind}`) ? t(`actors.${kind}`) : kind),
  };
};

const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatNumber(Math.abs(value))}`;

const LedgerTable = ({ rows }: { rows: readonly LedgerEntry[] }) => {
  const t = useTranslations("warehouse.history");
  const format = useFormat();
  const labels = useLabels();
  const regionName = useRegionName();
  const { openEntry } = useWarehouseDialogs();
  const imageOf = useItemImages();

  const columns: Column<LedgerEntry>[] = [
    {
      id: "at",
      header: t("at"),
      cell: (row) => (
        <span className="num text-ink-2 whitespace-nowrap">{format.dateTime(row.createdAt)}</span>
      ),
    },
    {
      id: "type",
      header: t("type"),
      primary: true,
      cell: (row) => (
        <span className="flex items-center gap-2">
          <ProductThumb name={row.item.name} src={imageOf(row.item.id)} />
          <span>
            <span className="font-semibold">{labels.type(row.movementType)}</span>
            <span className="text-ink-2"> · {row.item.name}</span>
          </span>
        </span>
      ),
    },
    {
      id: "location",
      header: t("location"),
      cell: (row) => (
        <span>
          {row.location.name}
          {row.region ? <span className="text-ink-3 text-xs"> · {regionName(row.region)}</span> : null}
        </span>
      ),
    },
    {
      id: "qty",
      header: t("quantity"),
      numeric: true,
      align: "right",
      cell: (row) => (
        <span className={cn("font-semibold", row.quantity < 0 ? "text-crit" : "text-good")}>
          {signed(row.quantity)}
        </span>
      ),
    },
    {
      id: "balance",
      header: t("balance"),
      numeric: true,
      align: "right",
      cell: (row) => (row.balanceAfter === null ? "—" : formatNumber(row.balanceAfter)),
    },
    {
      id: "actor",
      header: t("actor"),
      cell: (row) =>
        row.actor ? (
          <span>
            {row.actor.fullName}
            <span className="text-ink-3 text-xs"> · {labels.actor(row.actor.kind)}</span>
          </span>
        ) : (
          "—"
        ),
    },
    {
      id: "note",
      header: t("note"),
      cell: (row) => <span className="text-ink-2">{row.note || row.source?.number || "—"}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => String(row.id)}
      onRowClick={(row) => openEntry(row.id)}
      rowLabel={(row) =>
        t("openRow", { type: labels.type(row.movementType), at: format.dateTime(row.createdAt) })
      }
    />
  );
};

const Pagination = ({ count }: { count: number }) => {
  const t = useTranslations("warehouse.history");
  const { filters, setPage } = useLedgerFilters();
  const range = pageRange(filters.page, LEDGER_PAGE_SIZE, count);
  return (
    <nav aria-label={t("pages")} className="flex items-center gap-2 border-t px-4 py-3 md:px-5.5">
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

/** Qator tafsiloti: hujjat bo'lsa — to'liq hujjat; buyurtma (avtomatik) bo'lsa — qatorning o'zi. */
const EntryDrawer = ({ rows }: { rows: readonly LedgerEntry[] }) => {
  const t = useTranslations("warehouse.history");
  const labels = useLabels();
  const { entryId, closeEntry } = useWarehouseDialogs();
  const entry = rows.find((row) => row.id === entryId) ?? null;
  const sourceId = entry?.source?.type === "document" ? entry.source.id : null;
  const documentId = typeof sourceId === "number" ? sourceId : null;

  return (
    <Drawer
      open={entryId !== null}
      onOpenChange={(open) => (open ? undefined : closeEntry())}
      title={entry ? labels.type(entry.movementType) : t("entry")}
      subtitle={
        entry?.source?.number ? <span className="num text-ink-3 text-xs">{entry.source.number}</span> : null
      }
    >
      {entry ? (
        <>
          <EntrySummary entry={entry} />
          {documentId !== null ? <DocumentDetail id={documentId} /> : null}
        </>
      ) : (
        <StateBlock
          icon={History}
          title={t("entryMissingTitle")}
          description={t("entryMissingDescription")}
        />
      )}
    </Drawer>
  );
};

const EntrySummary = ({ entry }: { entry: LedgerEntry }) => {
  const t = useTranslations("warehouse.history");
  const format = useFormat();
  const labels = useLabels();
  return (
    <DrawerSection title={t("summary")}>
      <KvList
        rows={[
          { key: "at", label: t("at"), value: format.dateTime(entry.createdAt) },
          ...(entry.actor
            ? [
                {
                  key: "actor",
                  label: t("actor"),
                  value: `${entry.actor.fullName} · ${labels.actor(entry.actor.kind)}`,
                },
              ]
            : []),
          { key: "location", label: t("location"), value: entry.location.name },
          { key: "item", label: t("item"), value: entry.item.name },
          { key: "qty", label: t("quantity"), value: signed(entry.quantity) },
          ...(entry.balanceAfter === null
            ? []
            : [{ key: "balance", label: t("balance"), value: formatNumber(entry.balanceAfter) }]),
          ...(entry.note ? [{ key: "note", label: t("note"), value: entry.note }] : []),
        ]}
      />
    </DrawerSection>
  );
};

const DocumentDetail = ({ id }: { id: number }) => {
  const query = useDocumentQuery(id);
  return (
    <QueryState query={query} skeleton={<TableSkeleton rows={3} />}>
      {(document) => <DocumentBody document={document} />}
    </QueryState>
  );
};

const DocumentBody = ({ document }: { document: SkladDocument }) => {
  const t = useTranslations("warehouse.history");
  const tReason = useTranslations("warehouse.history.reasons");
  const imageOf = useItemImages();
  const reason = document.reason
    ? tReason.has(document.reason)
      ? tReason(document.reason)
      : document.reason
    : null;
  const isAdjustment = document.lines.some((line) => line.before !== null);
  return (
    <DrawerSection title={t("documentTitle", { number: document.number })}>
      <KvList
        rows={[
          { key: "location", label: t("location"), value: document.location.name },
          ...(reason ? [{ key: "reason", label: t("reason"), value: reason }] : []),
          ...(document.supplier ? [{ key: "supplier", label: t("supplier"), value: document.supplier }] : []),
          ...(document.refNumber ? [{ key: "ref", label: t("refNumber"), value: document.refNumber }] : []),
          ...(document.courier
            ? [{ key: "courier", label: t("courier"), value: document.courier.fullName }]
            : []),
          { key: "author", label: t("actor"), value: document.createdBy.fullName },
          { key: "total", label: t("total"), value: formatNumber(document.totalQty) },
        ]}
      />
      <ul className="mt-3 flex flex-col divide-y rounded-2xl border">
        {document.lines.map((line) => (
          <li key={line.item.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
            <ProductThumb name={line.item.name} src={imageOf(line.item.id)} />
            <span className="min-w-0 flex-1 truncate font-semibold">{line.item.name}</span>
            {isAdjustment ? (
              <span className="num text-ink-2">
                {t("beforeAfter", {
                  before: formatNumber(line.before ?? 0),
                  after: formatNumber(line.after ?? 0),
                })}
              </span>
            ) : (
              <span className="num">{formatNumber(line.quantity)}</span>
            )}
          </li>
        ))}
      </ul>
    </DrawerSection>
  );
};
