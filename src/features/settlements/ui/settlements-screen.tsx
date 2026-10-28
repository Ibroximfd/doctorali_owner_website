import { Grid, span } from "@/shared/ui/grid";
import { Reveal } from "@/shared/ui/motion/reveal";

import { AgingCard } from "./aging-card";
import { B2bTable } from "./b2b-table";
import { RegionsTable } from "./regions-table";
import { SettlementsHero } from "./settlements-hero";
import { SettlementsKpis } from "./settlements-kpis";

/** «Hisob-kitob»: hududlar va dorixonalar qarzi, to'lovlar va qarz muddatlari. */
export const SettlementsScreen = () => (
  <>
    <SettlementsHero />
    <SettlementsKpis />
    <Grid>
      <RegionsTable className={span.c8} />
      <AgingCard className={span.c4} />
      <Reveal className={span.full}>
        <B2bTable />
      </Reveal>
    </Grid>
  </>
);
