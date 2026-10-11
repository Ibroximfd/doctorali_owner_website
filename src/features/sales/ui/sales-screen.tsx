import { Grid, span } from "@/shared/ui/grid";

import { CallsCard } from "./calls-card";
import { FilialShareCard } from "./filial-share-card";
import { FilialsCard } from "./filials-card";
import { FilialsTrend } from "./filials-trend";
import { LeadFunnelCard } from "./lead-funnel-card";
import { LeadSourcesCard } from "./lead-sources-card";
import { MissedCallsCard } from "./missed-calls-card";
import { OperatorDrawer } from "./operator-drawer";
import { OperatorsTable } from "./operators-table";
import { RatingsCard } from "./ratings-card";
import { SalesKpis } from "./sales-kpis";

/**
 * "Sotuv jamoasi": avval filiallar (operator jamoalari) yonma-yon, keyin tanlangan
 * filial(lar) operatorlari, lidlari, qo'ng'iroqlari va baholari. Har blok o'z holatlarini o'zi ko'rsatadi.
 */
export const SalesScreen = () => (
  <>
    <SalesKpis />
    <Grid>
      <FilialsCard className={span.full} />
      <FilialsTrend className={span.c8} />
      <FilialShareCard className={span.c4} />
      <OperatorsTable className={span.full} />
      <LeadFunnelCard className={span.half4} />
      <LeadSourcesCard className={span.half4} />
      <RatingsCard className={span.c4} />
      <CallsCard className={span.c8} />
      <MissedCallsCard className={span.c4} />
    </Grid>
    <OperatorDrawer />
  </>
);
