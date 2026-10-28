import { Grid, span } from "@/shared/ui/grid";
import { Reveal } from "@/shared/ui/motion/reveal";

import { AuditCard } from "./audit-card";
import { ComponentsGrid } from "./components-grid";
import { SyncCard } from "./sync-card";
import { SystemHero } from "./system-hero";

/** «Tizim holati»: baza, navbat, integratsiyalar, ERP sinxroni va jurnal. */
export const SystemScreen = () => (
  <>
    <SystemHero />
    <Grid>
      <ComponentsGrid className={span.full} />
      <Reveal className={span.c5}>
        <SyncCard />
      </Reveal>
      <Reveal className={span.c7} delay={0.06}>
        <AuditCard />
      </Reveal>
    </Grid>
  </>
);
