"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { seriesColor } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { toAppError } from "@/shared/lib/app-error";
import { formatNumber } from "@/shared/lib/format";
import { filialCode } from "@/shared/meta/meta.schema";
import { useCanAct } from "@/shared/stores/session-store";
import { Button } from "@/shared/ui/button";
import { ChartCard } from "@/shared/ui/chart-card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PageHeader } from "@/shared/ui/page-header";
import { BlockSkeleton, ChartSkeleton, EmptyState, QueryState } from "@/shared/ui/states";

import {
  useFilialDialogs,
  usePerformanceQuery,
  useSetMainFilial,
  useStructureQuery,
} from "../hooks/use-filials";
import { sortFilials } from "../model/filials.rules";
import type { FilialItem, Performance, Structure } from "../model/filials.schema";
import { AuditCard } from "./audit-card";
import { FilialCard } from "./filial-card";
import { FilialFormDrawer } from "./filial-form-drawer";
import { LeaderDrawer } from "./leader-drawer";
import { LeaderSheet } from "./leader-sheet";

/**
 * «Filiallar» — boshqaruv (tuzilma v2 §2): call-center filiallarini yaratish va tahrirlash,
 * asosiy filialni belgilash, har filialga bitta B.L va bitta B.O tayinlab dopusk berish,
 * filial natijasi va tuzilma tarixi.
 */
export const FilialsScreen = () => {
  const t = useTranslations("filials");
  const canAct = useCanAct();
  const { openCreate } = useFilialDialogs();
  const structure = useStructureQuery();
  const performance = usePerformanceQuery();

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canAct ? (
            <Button intent="primary" onClick={openCreate}>
              <Plus aria-hidden />
              {t("create")}
            </Button>
          ) : null
        }
      />
      <QueryState
        query={structure}
        skeleton={
          <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <BlockSkeleton key={index} className="h-80 rounded-3xl" />
            ))}
          </div>
        }
        isEmpty={({ results }) => results.length === 0}
        empty={<EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />}
      >
        {(data) => (
          <FilialsBoard
            structure={data}
            performance={performance.data?.data}
            performanceState={performance.isPending ? "loading" : performance.data ? "ready" : "pending"}
          />
        )}
      </QueryState>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <QueryState query={performance} skeleton={<ChartSkeleton />}>
            {({ data, period }) => (
              <SalesTrend
                performance={data}
                names={structure.data?.results ?? []}
                granularity={period.granularity}
              />
            )}
          </QueryState>
        </div>
        <div className="min-w-0 xl:col-span-5">
          <AuditCard filials={structure.data?.results ?? []} />
        </div>
      </div>
    </>
  );
};

type BoardProps = {
  structure: Structure;
  performance: Performance | undefined;
  performanceState: "loading" | "pending" | "ready";
};

const FilialsBoard = ({ structure, performance, performanceState }: BoardProps) => {
  const t = useTranslations("filials");
  const [mainCandidate, setMainCandidate] = useState<FilialItem | null>(null);
  const setMain = useSetMainFilial();
  const mainError = setMain.error ? toAppError(setMain.error).code : null;
  const performanceOf = (id: number) => {
    if (performanceState === "loading") return undefined;
    if (performanceState === "pending") return "pending" as const;
    return performance?.filials.find((row) => row.filialId === id) ?? null;
  };

  const confirmMain = () => {
    if (!mainCandidate) return;
    setMain.mutate(mainCandidate.id, {
      onSuccess: () => {
        toast.success(t("makeMain.done", { name: mainCandidate.name }));
        setMainCandidate(null);
      },
    });
  };

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
        {sortFilials(structure.results).map((filial, index) => (
          <FilialCard
            key={filial.id}
            filial={filial}
            performance={performanceOf(filial.id)}
            onMakeMain={(item) => {
              setMain.reset();
              setMainCandidate(item);
            }}
            index={index}
          />
        ))}
      </div>

      <FilialFormDrawer filials={structure.results} />
      <LeaderDrawer filials={structure.results} />
      <LeaderSheet filials={structure.results} />
      <ConfirmDialog
        open={mainCandidate !== null}
        onOpenChange={(open) => (open ? undefined : setMainCandidate(null))}
        title={t("makeMain.title", { name: mainCandidate?.name ?? "" })}
        description={t("makeMain.description")}
        confirmLabel={t("makeMain.confirm")}
        pendingLabel={t("makeMain.pending")}
        isPending={setMain.isPending}
        error={
          setMain.isError
            ? t(mainError === "filial_inactive" ? "makeMain.inactive" : "makeMain.failed")
            : undefined
        }
        onConfirm={confirmMain}
      />
    </>
  );
};

/** Sotuv dinamikasi — har filial alohida chiziq (rang filialga biriktirilgan, tartibga emas). */
const SalesTrend = ({
  performance,
  names,
  granularity,
}: {
  performance: Performance;
  names: readonly FilialItem[];
  granularity: "hour" | "day" | "week" | "month";
}) => {
  const t = useTranslations("filials.trend");
  const format = useFormat();
  return (
    <ChartCard
      title={t("title")}
      description={t("description")}
      kind="trend"
      columnLabel={t("period")}
      formatValue={formatNumber}
      data={{
        labels: performance.labels.map((label) => format.bucket(label, granularity)),
        series: performance.filials.map((row) => {
          const filial = names.find((item) => item.id === row.filialId);
          return {
            key: `f${row.filialId}`,
            name: filial ? `${filialCode(filial)} · ${filial.name}` : String(row.filialId),
            // rang filial id siga bog'langan — filtr o'zgarsa ham filial rangi o'zgarmaydi
            color: seriesColor(row.filialId - 1),
            values: row.trend,
          };
        }),
      }}
    />
  );
};
