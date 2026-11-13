import type { XlsxCell, XlsxSheet } from "@/shared/lib/xlsx";

import { inlineText, tablesOf, type Block } from "./markdown";
import { formatCell, parseNumericCell } from "./numbers";

/** Savol hisobot so'raydimi (uz/ru, lotin va kirill). */
const REPORT_WORDS = /hisobot|xisobot|ҳисобот|hisobat|otchet|отч[её]т|сводк|svodka|report/iu;
export const asksForReport = (question: string | null | undefined): boolean =>
  question != null && REPORT_WORDS.test(question);

/** Javobda jadval yoki kamida ikki bo'lim bor — fayl qilib olishga arziydi. */
export const isStructured = (blocks: readonly Block[]): boolean =>
  tablesOf(blocks).length > 0 || blocks.filter((block) => block.type === "heading").length >= 2;

/** Hisobot sarlavhasi: javobning birinchi sarlavhasi, bo'lmasa savolning o'zi (qisqartirilgan). */
export const reportTitle = (blocks: readonly Block[], question: string | null, fallback: string): string => {
  const heading = blocks.find((block) => block.type === "heading");
  if (heading?.type === "heading") return inlineText(heading.content);
  const text = question?.trim().replace(/\s+/g, " ") ?? "";
  if (text === "") return fallback;
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
};

/** Fayl nomi: `AI-hisobot-2026-11-13-1205` (kengaytmasiz, xavfsiz belgilar). */
export const reportFileName = (prefix: string, at: Date): string => {
  const pad = (value: number) => String(value).padStart(2, "0");
  // Toshkent vaqti (UTC+5, yozgi vaqt yo'q)
  const local = new Date(at.getTime() + 5 * 3_600_000);
  const stamp = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}-${pad(local.getUTCHours())}${pad(local.getUTCMinutes())}`;
  return `${prefix.replace(/[^\p{L}\p{N}-]+/gu, "-")}-${stamp}`;
};

const CURRENCY = /^(so'?m|soʻm|so‘m|сум|sum|uzs)$/iu;

/** Jadval katagi Excel uchun: raqam — haqiqiy son (foiz — ulush), birlikli qiymat — formatlangan matn. */
export const toXlsxCell = (raw: string): XlsxCell => {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const cell = parseNumericCell(trimmed);
  if (!cell) return trimmed;
  // pul birligi — son bo'lib qoladi (ustunda yig'indi, saralash ishlasin); boshqa birlik — matn
  if (cell.unit && !CURRENCY.test(cell.unit)) return formatCell(trimmed);
  if (cell.percent) return { value: cell.value / 100, format: "percent" };
  return { value: cell.value, format: cell.decimals > 0 ? "decimal" : "integer" };
};

export type ReportMeta = {
  title: string;
  /** «Savol», «Tayyorlandi» — joriy tildagi yorliqlar. */
  labels: { question: string; generated: string; summarySheet: string; tableSheet: string };
  question: string | null;
  generatedAt: string;
};

const blockRows = (block: Block, depth = 0): XlsxCell[][] => {
  const pad = "   ".repeat(depth);
  switch (block.type) {
    case "heading":
      return [[], [{ value: inlineText(block.content), style: "bold" }]];
    case "paragraph":
      return [[inlineText(block.content)]];
    case "list":
      return block.items.flatMap((item, position) => [
        [`${pad}${block.ordered ? `${block.start + position}.` : "•"} ${inlineText(item.content)}`],
        ...item.children.flatMap((child) => blockRows(child, depth + 1)),
      ]);
    case "table":
      return [
        block.header.map((cell) => ({ value: inlineText(cell), style: "bold" as const })),
        ...block.rows.map((row) => row.map((cell) => toXlsxCell(inlineText(cell)))),
        [],
      ];
    case "quote":
      return block.children.flatMap((child) => blockRows(child, depth));
    case "code":
      return block.value.split("\n").map((line) => [line]);
    case "rule":
      return [[]];
  }
};

/**
 * Excel kitobi: birinchi varaq — to'liq hisobot (matn, ro'yxat, jadvallar ketma-ket), keyin har
 * jadval alohida varaqda (saralash va filtr uchun toza ko'rinish).
 */
export const reportSheets = (blocks: readonly Block[], meta: ReportMeta): XlsxSheet[] => {
  const summary: XlsxCell[][] = [
    [{ value: meta.title, style: "title" }],
    ...(meta.question ? [[`${meta.labels.question}: ${meta.question}`]] : []),
    [`${meta.labels.generated}: ${meta.generatedAt}`],
    [],
    // birinchi sarlavha sarlavha qatorida bor — takrorlanmaydi
    ...blocks
      .filter(
        (block, index) =>
          !(index === 0 && block.type === "heading" && inlineText(block.content) === meta.title),
      )
      .flatMap((block) => blockRows(block)),
  ];
  const tables = tablesOf(blocks).map((table, index): XlsxSheet => ({
    name: table.title ?? `${meta.labels.tableSheet} ${index + 1}`,
    headerRow: true,
    rows: [table.header, ...table.rows.map((row) => row.map(toXlsxCell))],
  }));
  return [{ name: meta.labels.summarySheet, rows: summary }, ...tables];
};
