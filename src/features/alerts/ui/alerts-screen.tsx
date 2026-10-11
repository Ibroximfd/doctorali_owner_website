import { Grid, span } from "@/shared/ui/grid";

import { AlertListCard } from "./alert-list-card";
import { RulesSummaryCard } from "./rules-summary-card";

/** "Signallar" sahifasi: tizim topgan muammolar va ular qaysi qoidadan chiqqani. */
export const AlertsScreen = () => (
  <Grid>
    <AlertListCard className={span.c8} />
    <RulesSummaryCard className={span.c4} />
  </Grid>
);
