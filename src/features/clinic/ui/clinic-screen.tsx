"use client";

import { useScope } from "@/shared/hooks/use-scope";
import { useMetaQuery } from "@/shared/meta/use-meta-query";
import { Card, CardBody } from "@/shared/ui/card";
import { Grid, span } from "@/shared/ui/grid";
import { ChartSkeleton, StatRowSkeleton } from "@/shared/ui/states";

import { clinicAvailability } from "../model/clinic.rules";
import { BranchesTable } from "./branches-table";
import { ClinicDoctorsTable } from "./clinic-doctors-table";
import { ClinicKpis } from "./clinic-kpis";
import { NoClinicState } from "./no-clinic-state";
import { RevenueMixChart } from "./revenue-mix-chart";
import { VisitsCard } from "./visits-card";
import { WarehouseCard } from "./warehouse-card";

/**
 * "Klinika" sahifasi. Tanlangan filiallarda klinika bo'lmasa bloklar chizilmaydi
 * (so'rovlar ham ketmaydi) — o'rniga tushuntirish va filtrni tozalash tugmasi.
 */
export const ClinicScreen = () => {
  const { scope, setFilials } = useScope();
  const meta = useMetaQuery();
  const availability = clinicAvailability(scope.filials, meta.data?.filials);

  // Filiallar lug'ati kelguncha klinika bor-yo'qligi noma'lum — so'rov yubormay kutamiz.
  if (availability === "unknown" && meta.isPending) {
    return (
      <>
        <StatRowSkeleton />
        <Card>
          <CardBody>
            <ChartSkeleton />
          </CardBody>
        </Card>
      </>
    );
  }

  if (availability === "unavailable") {
    const selected = (meta.data?.filials ?? []).filter((filial) => scope.filials.includes(filial.id));
    return (
      <NoClinicState
        filialNames={selected.map((filial) => filial.name)}
        onShowAll={() => void setFilials([])}
      />
    );
  }

  // Lug'at yuklanmagan bo'lsa ham (xato) sahifa ishlaydi: filialni backendning o'zi hal qiladi.
  return (
    <>
      <ClinicKpis />
      <Grid>
        <RevenueMixChart className={span.c8} />
        <VisitsCard className={span.c4} />
        <BranchesTable className={span.full} />
        <ClinicDoctorsTable className={span.c7} />
        <WarehouseCard className={span.c5} />
      </Grid>
    </>
  );
};
