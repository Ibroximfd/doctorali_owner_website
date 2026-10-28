import { ATTACHMENT_REPORTS } from "@/shared/testing/fixtures/handlers/ai-answers";
import { resolveMock } from "@/shared/testing/fixtures/registry";

import { buildPdf } from "./pdf";
import { buildXlsx, type Cell, type Sheet } from "./xlsx";

/**
 * Demo rejimdagi yuklab olinadigan fayllar: eksport qilingan hisobotlar va AI
 * ilovalari. Mazmuni — o'sha namuna bazadan (ekrandagi raqamlar bilan bir xil).
 */

type Source = { title: string; path: string; pick?: (data: unknown) => unknown };
type Report = { title: string; period: string; sources: readonly Source[] };

const REPORTS: Record<string, Report> = {
  daily: {
    title: "Kunlik hisobot",
    period: "today",
    sources: [
      { title: "Buyurtmalar", path: "orders/summary/" },
      { title: "Moliya", path: "finance/summary/" },
      { title: "Filiallar", path: "sales/filials/" },
    ],
  },
  weekly: {
    title: "Haftalik hisobot",
    period: "7d",
    sources: [
      { title: "Buyurtmalar", path: "orders/summary/" },
      { title: "Moliya", path: "finance/summary/" },
      { title: "Filiallar", path: "sales/filials/" },
    ],
  },
  monthly_pl: {
    title: "Oylik foyda va zarar",
    period: "month",
    sources: [
      { title: "Moliya", path: "finance/summary/" },
      { title: "Xarajatlar", path: "finance/expenses/" },
    ],
  },
  operators: {
    title: "Operatorlar",
    period: "30d",
    sources: [{ title: "Operatorlar", path: "sales/operators/" }],
  },
  couriers_cod: {
    title: "Kuryerlar va naqd pul",
    period: "7d",
    sources: [{ title: "Kuryerlar", path: "logistics/couriers/" }],
  },
  debts: {
    title: "Qarzdorlik",
    period: "30d",
    sources: [
      { title: "Qarzdorlar", path: "finance/debts/", pick: (data) => field(data, "top_debtors") },
      { title: "Muddat bo'yicha", path: "finance/debts/", pick: (data) => field(data, "aging") },
    ],
  },
  products: {
    title: "Mahsulotlar",
    period: "30d",
    sources: [{ title: "Mahsulotlar", path: "products/", pick: (data) => field(data, "results") }],
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const field = (data: unknown, key: string): unknown => (isRecord(data) ? data[key] : undefined);

/** `{value, previous, delta_pct}` — ko'rsatkich; jadvalda uning qiymati yoziladi. */
const metricValue = (value: unknown): Cell | undefined => {
  if (typeof value === "number" || typeof value === "string") return value;
  if (value === null) return null;
  if (isRecord(value) && typeof value.value === "number") return value.value;
  return undefined;
};

const HEADINGS: Record<string, string> = {
  name: "Nomi",
  full_name: "F.I.Sh.",
  filial: "Filial",
  client: "Mijoz",
  phone: "Telefon",
  category: "Turkum",
  bucket: "Muddat (kun)",
  amount: "Summa",
  count: "Soni",
  remaining: "Qoldiq",
  overdue_days: "Kechikish (kun)",
  revenue: "Tushum",
  units: "Dona",
  leads: "Lidlar",
  calls: "Qo'ng'iroqlar",
  delivered: "Yetkazilgan",
  assigned: "Biriktirilgan",
  cancelled: "Bekor",
  orders_delivered: "Yetkazilgan",
  orders_created: "Yaratilgan",
  sales_amount: "Savdo",
  conversion_pct: "Konversiya, %",
  cod_collected: "Yig'ilgan naqd",
  cod_unsettled: "Topshirilmagan naqd",
  success_rate: "Muvaffaqiyat, %",
  rating_avg: "Reyting",
};

const heading = (key: string): string =>
  HEADINGS[key] ?? key.replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());

/** Yozuvlar ro'yxatini jadvalga aylantiradi: oddiy qiymatli ustunlar, id siz. */
const tableOf = (records: readonly Record<string, unknown>[]): Cell[][] => {
  const first = records[0];
  if (!first) return [["Ma'lumot yo'q"]];
  const keys = Object.keys(first).filter((key) => key !== "id" && metricValue(first[key]) !== undefined);
  return [keys.map(heading), ...records.map((record) => keys.map((key) => metricValue(record[key]) ?? null))];
};

/** Ko'rsatkichlar obyekti: har biri — joriy, oldingi va o'zgarish foizi. */
const metricsOf = (data: Record<string, unknown>): Cell[][] => [
  ["Ko'rsatkich", "Joriy", "Oldingi", "O'zgarish, %"],
  ...Object.entries(data).flatMap(([key, value]): Cell[][] => {
    if (isRecord(value) && typeof value.value === "number")
      return [
        [
          heading(key),
          value.value,
          metricValue(value.previous) ?? null,
          metricValue(value.delta_pct) ?? null,
        ],
      ];
    if (typeof value === "number") return [[heading(key), value, null, null]];
    return [];
  }),
];

const sheetOf = (source: Source, period: string, now: Date): Sheet => {
  const response = resolveMock({
    method: "GET",
    path: source.path,
    searchParams: new URLSearchParams({ period }),
    now,
  });
  const data = field(response.json, "data");
  const picked = source.pick ? source.pick(data) : data;
  const list = Array.isArray(picked) ? picked : field(picked, "results");
  const rows = Array.isArray(list)
    ? tableOf(list.filter(isRecord))
    : isRecord(picked)
      ? metricsOf(picked)
      : [["Ma'lumot yo'q"]];
  return { name: source.title, rows };
};

export type DemoFile = { name: string; type: string; bytes: Uint8Array };

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const fileName = (title: string, date: string, extension: string): string =>
  `${title.replace(/[^\p{L}\p{N}]+/gu, "_")}_${date}.${extension}`;

export const buildReportFile = (kind: string, format: string, now: Date): DemoFile => {
  const report = REPORTS[kind] ?? REPORTS.daily;
  if (!report) throw new Error("daily report missing");
  const date = now.toISOString().slice(0, 10);
  const title = `Doctor Ali — ${report.title} (${date})`;
  const sheets = report.sources.map((source) => sheetOf(source, report.period, now));

  if (format === "pdf")
    return {
      name: fileName(report.title, date, "pdf"),
      type: "application/pdf",
      bytes: buildPdf(title, sheets),
    };
  const cover: Sheet = {
    name: "Umumiy",
    rows: [
      ["Hisobot", report.title],
      ["Sana", date],
      ["Manba", "Doctor Ali Nazorat (demo)"],
    ],
  };
  return {
    name: fileName(report.title, date, "xlsx"),
    type: XLSX_TYPE,
    bytes: buildXlsx([cover, ...sheets]),
  };
};

/** AI suhbatidagi ilova — javob mavzusidagi hisobot, Excel ko'rinishida. */
export const buildAttachmentFile = (id: number, now: Date): DemoFile =>
  buildReportFile(ATTACHMENT_REPORTS[id] ?? "daily", "xlsx", now);
