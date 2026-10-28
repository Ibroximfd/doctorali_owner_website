"use client";

import { motion, useReducedMotion } from "motion/react";
import { Download, ExternalLink, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { seriesColor } from "@/shared/config/chart-palette";
import { routes } from "@/shared/config/routes";
import { useFormat } from "@/shared/hooks/use-format";
import { useOrderDrawer } from "@/shared/hooks/use-order-drawer";
import { cn } from "@/shared/lib/cn";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { ColumnChart, TrendChart } from "@/shared/ui/charts";
import { MetricDelta } from "@/shared/ui/metric-delta";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { ScopeLink } from "@/shared/ui/scope-link";

import { attachmentHref, isKnownBlock } from "../model/ai.rules";
import type { ChatAttachment, ChatBlock } from "../model/ai.schema";

/** AI javobidagi tuzilmali bloklar: KPI, jadval, ro'yxat, grafik, havolalar. Noma'lum tur o'tkazib yuboriladi. */
export const ChatBlocks = ({ blocks }: { blocks: readonly ChatBlock[] }) => (
  <>
    {blocks.filter(isKnownBlock).map((block, index) => (
      <div key={index} className="mt-4">
        {block.title ? <div className="text-ink-2 mb-2 text-xs">{block.title}</div> : null}
        {block.type === "kpis" ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {block.items.map((item) => (
              <div key={item.label} className="bg-surface-2/60 rounded-2xl border p-3.5">
                <div className="text-ink-2 truncate text-xs">{item.label}</div>
                <div className="num mt-0.5 text-2xl font-semibold">{item.value}</div>
                {item.deltaPct === undefined ? null : <MetricDelta value={item.deltaPct} className="mt-1" />}
              </div>
            ))}
          </div>
        ) : null}
        {block.type === "table" ? (
          <div className="bg-surface-2/40 overflow-x-auto rounded-2xl border">
            <table className="w-full text-xs">
              <thead className="text-ink-2">
                <tr>
                  {block.columns.map((column) => (
                    <th
                      key={column}
                      scope="col"
                      className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={cn("px-3 py-1.5 whitespace-nowrap", cellIndex > 0 && "num")}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {block.type === "bullets" ? (
          <ul className="flex flex-col gap-1">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex gap-2 text-sm">
                <span aria-hidden className="bg-gold mt-2 size-1.5 shrink-0 rounded-full" />
                {item}
              </li>
            ))}
          </ul>
        ) : null}
        {block.type === "chart" ? (
          isBarLines(block) ? (
            <BarLines block={block} />
          ) : (
            <ChatChart block={block} />
          )
        ) : null}
        {block.type === "links" ? <ChatLinks block={block} /> : null}
      </div>
    ))}
  </>
);

type ChartBlock = Extract<ChatBlock, { type: "chart" }>;
type LinksBlock = Extract<ChatBlock, { type: "links" }>;

/** AI chizgan grafik: chiziq yoki ustun, birlik bo'yicha formatlangan o'q. */
const ChatChart = ({ block }: { block: ChartBlock }) => {
  const format = useFormat();
  const formatValue = (value: number) =>
    block.unit === "uzs"
      ? format.moneyCompact(value)
      : block.unit === "pct"
        ? formatPercent(value)
        : formatNumber(value);
  const Chart = block.kind === "bar" ? ColumnChart : TrendChart;
  return (
    <div className="bg-surface-2/40 h-48 rounded-2xl border p-2">
      <Chart
        ariaLabel={block.title ?? ""}
        formatValue={formatValue}
        data={{
          labels: block.labels.map((label) =>
            /^\d{4}-\d{2}-\d{2}/.test(label) ? format.bucket(label, "day") : label,
          ),
          series: block.series.map((series, index) => ({
            key: `s${index}`,
            name: series.name,
            color: seriesColor(index),
            values: series.values,
            area: block.series.length === 1,
          })),
        }}
      />
    </div>
  );
};

/** AI javobidagi havolalar: buyurtma, kuryer, ombor, muammo, xodim yoki bo'lim — bir bosishda ochiladi. */
const ChatLinks = ({ block }: { block: LinksBlock }) => {
  const { openOrder } = useOrderDrawer();
  const hrefOf = (kind: string, id: string): string | null => {
    if (kind === "courier") return `${routes.logistics}?courier=${encodeURIComponent(id)}`;
    if (kind === "warehouse") return `${routes.warehouse}?warehouse=${encodeURIComponent(id)}`;
    if (kind === "issue") return `${routes.issues}?issue=${encodeURIComponent(id)}`;
    if (kind === "operator") return `${routes.staff}?staff=${encodeURIComponent(id)}`;
    // `id in routes` tekshirildi — kalit `routes` da bor, `as` xavfsiz
    if (kind === "section" && id in routes) return routes[id as keyof typeof routes];
    return null;
  };
  return (
    <ul className="flex flex-wrap gap-2">
      {block.items.map((item) => {
        const className =
          "border-accent/35 text-accent hover:bg-accent-soft inline-flex h-8.5 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors";
        if (item.kind === "order") {
          return (
            <li key={`${item.kind}-${item.id}`}>
              <button type="button" className={className} onClick={() => openOrder(item.id)}>
                {item.label}
                <ExternalLink aria-hidden className="size-3" />
              </button>
            </li>
          );
        }
        const href = hrefOf(item.kind, item.id);
        return href ? (
          <li key={`${item.kind}-${item.id}`}>
            <ScopeLink href={href} className={className}>
              {item.label}
              <ExternalLink aria-hidden className="size-3" />
            </ScopeLink>
          </li>
        ) : null;
      })}
    </ul>
  );
};

/** Hisobot fayli: tayyor bo'lsa bir bosishda yuklanadi, aks holda «tayyorlanmoqda». */
export const AttachmentCard = ({ attachment }: { attachment: ChatAttachment }) => {
  const t = useTranslations("ai.chat");
  const isReady = attachment.status === "ready";
  const isFailed = attachment.status === "failed";

  return (
    <div className="border-accent/25 from-accent/12 to-accent/3 mt-3.5 flex flex-wrap items-center gap-3.5 rounded-2xl border bg-linear-to-r px-4 py-3.5">
      <span
        aria-hidden
        className="bg-good-soft text-good border-good/30 num text-2xs grid h-13 w-11 shrink-0 place-items-center rounded-lg border font-bold uppercase shadow-lg"
      >
        {attachment.format}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{attachment.title}</span>
        <span className="text-ink-2 block text-xs">
          {isReady ? t("fileReady") : isFailed ? t("fileFailed") : t("filePending")}
        </span>
      </span>
      {isReady ? (
        <a
          href={attachmentHref(attachment.id)}
          download
          className="bg-accent text-accent-ink inline-flex min-h-10.5 items-center gap-2 rounded-xl px-4.5 text-sm font-bold transition hover:brightness-110"
        >
          <Download aria-hidden className="size-4" />
          {t("download")}
        </a>
      ) : isFailed ? null : (
        <LoaderCircle aria-label={t("filePending")} className="text-ink-3 size-5 animate-spin" />
      )}
    </div>
  );
};

/** Bitta qatorli ustun grafik (≤ 8 ta) — «filial chiziqlari» ko'rinishida: nom · chiziq · qiymat. */
const BAR_LINES_MAX = 8;
const isBarLines = (block: ChartBlock): boolean =>
  block.kind === "bar" && block.series.length === 1 && block.labels.length <= BAR_LINES_MAX;

const BarLines = ({ block }: { block: ChartBlock }) => {
  const format = useFormat();
  const reduce = useReducedMotion();
  const values = block.series[0]?.values ?? [];
  const max = Math.max(...values, 0);
  const formatValue = (value: number) =>
    block.unit === "uzs"
      ? format.moneyCompact(value)
      : block.unit === "pct"
        ? formatPercent(value)
        : formatNumber(value);
  return (
    <ul className="bg-surface-2/40 flex flex-col gap-2.5 rounded-2xl border p-4">
      {block.labels.map((label, index) => {
        const value = values[index] ?? 0;
        return (
          <li key={label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-sm sm:w-28">{label}</span>
            <span aria-hidden className="bg-ink/5 h-2.5 min-w-0 flex-1 overflow-hidden rounded-full">
              <motion.span
                className="from-forest-2 to-accent block h-full origin-left rounded-full bg-linear-to-r"
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: max > 0 ? Math.max(0, value) / max : 0 }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.4 + index * 0.1 }}
              />
            </span>
            <span className="num w-20 shrink-0 text-right text-sm font-semibold">{formatValue(value)}</span>
          </li>
        );
      })}
    </ul>
  );
};

/**
 * Javob tarkibi chiplari: AI shu javob uchun tayyorlagan qismlar (blok sarlavhalari va fayllar) —
 * har biriga «tekshirildi» belgisi chiziladi. API vosita chaqiruvlarini bermaydi; faqat bor qismlar.
 */
export const AnswerParts = ({
  blocks,
  attachments,
}: {
  blocks: readonly ChatBlock[];
  attachments: readonly ChatAttachment[];
}) => {
  const t = useTranslations("ai.chat");
  const reduce = useReducedMotion();
  const parts = [
    ...blocks.filter(isKnownBlock).flatMap((block) => (block.title ? [block.title] : [])),
    ...attachments.filter((file) => file.status === "ready").map((file) => file.title),
  ];
  if (parts.length === 0) return null;
  return (
    <ol aria-label={t("parts")} className="mb-3 flex flex-wrap gap-1.5">
      {parts.map((part, index) => (
        <motion.li
          key={`${part}-${index}`}
          initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.3 + index * 0.15 }}
          className="bg-accent/8 border-accent/20 text-accent inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-xs"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none">
            <motion.path
              d="M3.5 8.5l3 3 6-7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.5 + index * 0.15 }}
            />
          </svg>
          <span className="truncate">{part}</span>
        </motion.li>
      ))}
    </ol>
  );
};
