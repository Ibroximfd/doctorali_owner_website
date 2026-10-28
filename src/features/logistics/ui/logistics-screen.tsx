import type { ReactNode } from "react";

import { Grid, span } from "@/shared/ui/grid";

import { AttemptReasonsCard } from "./attempt-reasons-card";
import { CourierDrawer } from "./courier-drawer";
import { CouriersTable } from "./couriers-table";
import { DailyDeliveriesChart } from "./daily-deliveries-chart";
import { HandoversCard } from "./handovers-card";
import { LiveBoardCard } from "./live-board";
import { LogisticsKpis } from "./logistics-kpis";
import { RegionTimesCard } from "./region-times-card";
import { TransfersTable } from "./transfers-table";

/** "Yetkazib berish" sahifasi: kuryerlar ishi va naqd pul nazorati. Har blok o'z holatlarini o'zi ko'rsatadi. */
/** `regionSlot` — hudud xaritasi (`features/regions`), kompozitsiya `app` da. */
export const LogisticsScreen = ({ regionSlot }: { regionSlot?: ReactNode }) => (
  <>
    <LogisticsKpis />
    <Grid>
      {regionSlot ? <div className={span.full}>{regionSlot}</div> : null}
      <LiveBoardCard className={span.c8} />
      <HandoversCard className={span.c4} />
      <CouriersTable className={span.full} />
      <DailyDeliveriesChart className={span.c8} />
      <AttemptReasonsCard className={span.c4} />
      <RegionTimesCard className={span.c6} />
      <TransfersTable className={span.c6} />
    </Grid>
    {/* Kuryer kartasi `?courier=<id>` orqali ochiladi (jadval qatori yoki ulashilgan havola). */}
    <CourierDrawer />
  </>
);
