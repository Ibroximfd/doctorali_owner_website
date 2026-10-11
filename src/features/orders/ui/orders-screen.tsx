import { Grid, span } from "@/shared/ui/grid";

import { CancelReasonsCard } from "./cancel-reasons-card";
import { ConfirmationCard } from "./confirmation-card";
import { FunnelCard } from "./funnel-card";
import { OrdersHeatmapCard } from "./orders-heatmap-card";
import { OrdersKpis } from "./orders-kpis";
import { OrdersTrend } from "./orders-trend";
import { RecentOrdersCard } from "./recent-orders-card";
import { RegionsCard } from "./regions-card";
import { SourceCard } from "./source-card";
import { StageDurationsCard } from "./stage-durations-card";
import { StuckOrdersCard } from "./stuck-orders-card";

/** "Buyurtmalar" sahifasi: xulosa → voronka va trend → kesimlar → aniq buyurtmalar. Har blok o'z holatlarini o'zi ko'rsatadi. */
export const OrdersScreen = () => (
  <>
    <OrdersKpis />
    <Grid>
      <FunnelCard className={span.c7} />
      <OrdersTrend className={span.c5} />
      <SourceCard className={span.half4} />
      <RegionsCard className={span.half4} />
      <CancelReasonsCard className={span.c4} />
      <ConfirmationCard className={span.half4} />
      <StageDurationsCard className={span.half4} />
      <OrdersHeatmapCard className={span.c4} />
      <StuckOrdersCard className={span.c5} />
      <RecentOrdersCard className={span.c7} />
    </Grid>
  </>
);
