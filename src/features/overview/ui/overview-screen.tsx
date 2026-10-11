import { Grid, span } from "@/shared/ui/grid";

import { AttentionCard } from "./attention-card";
import { CashPositionCard } from "./cash-position-card";
import { FilialsTable } from "./filials-table";
import { LiveFeed } from "./live-feed";
import { OverviewKpis } from "./overview-kpis";
import { PipelineCard } from "./pipeline-card";
import { RevenueHero } from "./revenue-hero";
import { RevenueTrend } from "./revenue-trend";

/** "Umumiy" sahifasi: xulosa tepada, tafsilot pastda. Har blok o'z holatlarini o'zi ko'rsatadi. */
export const OverviewScreen = () => (
  <>
    <Grid className="mb-4">
      <RevenueHero className={span.c8} />
      <AttentionCard className={span.c4} />
    </Grid>
    <OverviewKpis />
    <Grid>
      <RevenueTrend className={span.c8} />
      <LiveFeed className={span.c4} />
      <PipelineCard className={span.full} />
      <FilialsTable className={span.c8} />
      <CashPositionCard className={span.c4} />
    </Grid>
  </>
);
