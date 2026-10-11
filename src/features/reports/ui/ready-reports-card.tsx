"use client";

import {
  ChartLine,
  Download,
  FileText,
  Headset,
  Leaf,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";

import { useMetaQuery } from "@/shared/meta/use-meta-query";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";

import { useRequestExport } from "../hooks/use-exports";
import {
  EXPORT_FORMATS,
  EXPORT_PERIODS,
  REPORT_KINDS,
  type ExportFormat,
  type ExportPeriod,
  type ReportKind,
} from "../model/reports.schema";
import { SelectField } from "./select-field";

const REPORT_ICON: Record<ReportKind, LucideIcon> = {
  daily: FileText,
  weekly: ChartLine,
  monthly_pl: Wallet,
  operators: Headset,
  couriers_cod: Truck,
  debts: Users,
  products: Leaf,
};

const DEFAULT_PERIOD: ExportPeriod = "30d";
const ALL_FILIALS = "all";

/** Tayyor hisobotlar: davr va filial tanlanadi, so'ng Excel yoki PDF so'raladi. */
export const ReadyReportsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("reports.ready");
  const tScope = useTranslations("scope");
  const periodId = useId();
  const filialId = useId();
  const [period, setPeriod] = useState<ExportPeriod>(DEFAULT_PERIOD);
  const [filial, setFilial] = useState(ALL_FILIALS);
  const filials = useMetaQuery().data?.filials ?? [];

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <div role="group" aria-label={t("scopeLabel")} className="grid grid-cols-2 gap-2.5 border-b pb-3.5">
          <SelectField
            id={periodId}
            label={tScope("periodLabel")}
            value={period}
            onChange={setPeriod}
            options={EXPORT_PERIODS.map((value) => ({ value, label: tScope(`periodLong.${value}`) }))}
          />
          <SelectField
            id={filialId}
            label={tScope("filialLabel")}
            value={filial}
            onChange={setFilial}
            options={[
              { value: ALL_FILIALS, label: tScope("filial.all") },
              ...filials.map((item) => ({ value: String(item.id), label: item.name })),
            ]}
          />
        </div>
        <ul>
          {REPORT_KINDS.map((report) => (
            <ReportRow
              key={report}
              report={report}
              period={period}
              filial={filial === ALL_FILIALS ? undefined : filial}
            />
          ))}
        </ul>
      </CardBody>
    </Card>
  );
};

type ReportRowProps = { report: ReportKind; period: ExportPeriod; filial: string | undefined };

/** Bitta hisobot: so'rov ketayotganda shu qatorning tugmalari band — ikki marta yuborilmaydi. */
const ReportRow = ({ report, period, filial }: ReportRowProps) => {
  const t = useTranslations("reports");
  const exportRequest = useRequestExport();
  const Icon = REPORT_ICON[report];
  const title = t(`kinds.${report}.title`);

  const request = (format: ExportFormat) => {
    if (exportRequest.isPending) return;
    exportRequest.mutate(
      { report, format, period, filial },
      { onSuccess: () => toast.success(t("ready.requested")), onError: () => toast.error(t("ready.failed")) },
    );
  };

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b py-3 last:border-b-0 last:pb-0">
      <span
        aria-hidden
        className="bg-surface-3 text-ink-2 grid size-7 shrink-0 place-items-center rounded-md"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 basis-40 leading-tight">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-ink-3 mt-0.5 text-xs">{t(`kinds.${report}.description`)}</div>
      </div>
      <div className="flex shrink-0 gap-2">
        {EXPORT_FORMATS.map((format) => (
          <Button
            key={format}
            size="sm"
            disabled={exportRequest.isPending}
            aria-label={t("ready.exportLabel", { report: title, format: t(`formats.${format}`) })}
            onClick={() => request(format)}
          >
            <Download aria-hidden />
            {t(`formats.${format}`)}
          </Button>
        ))}
      </div>
    </li>
  );
};
