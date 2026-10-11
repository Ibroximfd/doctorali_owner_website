"use client";

import { Check, Clock, Download, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Pill, type PillIntent } from "@/shared/ui/pill";
import { EmptyState, QueryState, TableSkeleton } from "@/shared/ui/states";

import { useExportPolling, useExportsQuery } from "../hooks/use-exports";
import {
  downloadState,
  isExportFormat,
  isExportStatus,
  isReportKind,
  pendingJobIds,
  type ExportStatusKey,
} from "../model/reports.rules";
import type { ExportJob } from "../model/reports.schema";

const DASH = "—";

const STATUS_PILL: Record<ExportStatusKey, { intent: PillIntent; icon: LucideIcon }> = {
  pending: { intent: "info", icon: Clock },
  running: { intent: "info", icon: Clock },
  ready: { intent: "good", icon: Check },
  failed: { intent: "crit", icon: TriangleAlert },
};

/** `YYYY-MM-DD` → formatlovchi kutadigan lahza (Toshkent kunining o'rtasi — sana siljimaydi). */
const atNoon = (isoDate: string): string => `${isoDate}T12:00:00+05:00`;

type ExportHistoryCardProps = {
  className?: string;
  /** Kutilayotgan fayl holatini so'rash oralig'i (sukutda `EXPORT_POLL_MS`). */
  pollIntervalMs?: number;
};

const useMinuteClock = (): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
};

/** Eksport tarixi: tayyorlanayotgan fayl holati o'zi yangilanadi, tayyor bo'lgach yuklab olish havolasi chiqadi. */
export const ExportHistoryCard = ({ className, pollIntervalMs }: ExportHistoryCardProps) => {
  const t = useTranslations("reports");
  const format = useFormat();
  const query = useExportsQuery();
  useExportPolling(pendingJobIds(query.data ?? []), pollIntervalMs);

  // Havola muddati hozirgi vaqtga nisbatan (daqiqada bir yangilanadi): sahifa uzoq ochiq
  // tursa ham eskirgan havola faol ko'rinmaydi.
  const now = useMinuteClock();
  const checkedAt = Math.max(query.dataUpdatedAt, now);
  const reportLabel = (report: string): string =>
    isReportKind(report) ? t(`kinds.${report}.title`) : report;
  const periodLabel = (job: ExportJob): string =>
    job.dateFrom === job.dateTo
      ? format.date(atNoon(job.dateFrom))
      : `${format.date(atNoon(job.dateFrom))} – ${format.date(atNoon(job.dateTo))}`;

  const columns: Column<ExportJob>[] = [
    {
      id: "report",
      header: t("history.columns.report"),
      primary: true,
      cell: (job) => <span className="font-semibold">{reportLabel(job.report)}</span>,
    },
    { id: "period", header: t("history.columns.period"), numeric: true, cell: periodLabel },
    {
      id: "filial",
      header: t("history.columns.filial"),
      cell: (job) => job.filial ?? t("history.allFilials"),
    },
    {
      id: "format",
      header: t("history.columns.format"),
      cell: (job) => (isExportFormat(job.format) ? t(`formats.${job.format}`) : job.format),
    },
    {
      id: "status",
      header: t("history.columns.status"),
      cell: (job) => {
        // Noma'lum (yangi) holat yiqitmaydi — qiymatning o'zi neytral belgida.
        if (!isExportStatus(job.status)) return <Pill>{job.status}</Pill>;
        const { intent, icon } = STATUS_PILL[job.status];
        return (
          <Pill intent={intent} icon={icon}>
            {t(`history.status.${job.status}`)}
          </Pill>
        );
      },
    },
    {
      id: "createdAt",
      header: t("history.columns.createdAt"),
      align: "right",
      numeric: true,
      cell: (job) => format.dateTime(job.createdAt),
    },
    {
      id: "file",
      header: t("history.columns.file"),
      align: "right",
      cell: (job) => {
        const state = downloadState(job, checkedAt);
        if (state === "available" && job.url) {
          return (
            <a
              href={job.url}
              download
              // Imzolangan fayl boshqa domenda: `download` e'tiborsiz qoladi — panel o'rnida ochilmasin.
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("history.downloadLabel", { report: reportLabel(job.report) })}
              className="text-accent inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            >
              <Download aria-hidden className="size-3.5" />
              {t("history.download")}
            </a>
          );
        }
        return (
          <span className="text-ink-3 text-xs">{state === "expired" ? t("history.expired") : DASH}</span>
        );
      },
    },
  ];

  return (
    <Card className={className}>
      <CardHeader title={t("history.title")} description={t("history.description")} />
      <CardBody flush>
        <QueryState
          query={query}
          skeleton={<TableSkeleton rows={3} />}
          isEmpty={(jobs) => jobs.length === 0}
          empty={<EmptyState title={t("history.emptyTitle")} description={t("history.emptyDescription")} />}
        >
          {(jobs) => (
            // holat o'zgarishi (tayyorlanmoqda → tayyor) ekran o'quvchiga ham e'lon qilinadi
            <div aria-live="polite">
              <DataTable columns={columns} rows={jobs} rowKey={(job) => job.jobId} />
            </div>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
