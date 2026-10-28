import type { ReactNode } from "react";

import { Grid, span } from "@/shared/ui/grid";
import { Reveal } from "@/shared/ui/motion/reveal";

import { AttentionCard } from "./attention-card";
import { CashPositionCard } from "./cash-position-card";
import { FilialsTable } from "./filials-table";
import { LiveFeed } from "./live-feed";
import { OverviewKpis } from "./overview-kpis";
import { PipelineCard } from "./pipeline-card";
import { RevenueHero } from "./revenue-hero";
import { RevenueRiver } from "./revenue-river";

/**
 * "Umumiy" sahifasi: «brief» sarlavhadan keyin xarita sahnasi, instrument panellar, pul oqimi
 * va «Hozir» vaqt chizig'i; tafsilot pastda. Har blok o'z holatlarini o'zi ko'rsatadi.
 * `regionSlot` — hudud xaritasi (`features/regions`), kompozitsiya `app` da.
 */
export const OverviewScreen = ({ regionSlot }: { regionSlot?: ReactNode }) => (
  <>
    {regionSlot ? <Reveal className="mb-4">{regionSlot}</Reveal> : null}
    <OverviewKpis />
    <Grid>
      <RevenueRiver className={span.c8} />
      <LiveFeed className={span.c4} />
      <RevenueHero className={span.c8} />
      <AttentionCard className={span.c4} />
      <PipelineCard className={span.full} />
      <FilialsTable className={span.c8} />
      <CashPositionCard className={span.c4} />
    </Grid>
  </>
);
