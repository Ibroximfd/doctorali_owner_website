import { Grid, span } from "@/shared/ui/grid";

import { CancelFunnelCard, ConfirmFunnelCard } from "./app-funnels";
import { AppKpis } from "./app-kpis";
import { AppUsersChart } from "./app-users-chart";
import { ConsultationsCard } from "./consultations-card";
import { DevicesCard } from "./devices-card";
import { DoctorAppCard } from "./doctor-app-card";
import { EngagementCard } from "./engagement-card";
import { LanguagesCard } from "./languages-card";
import { LoyaltyCard } from "./loyalty-card";

/** "Mobil ilova" sahifasi: ilova o'syaptimi va undan foydalanishyaptimi. Har blok o'z holatlarini o'zi ko'rsatadi. */
export const MobileAppScreen = () => (
  <>
    <AppKpis />
    <Grid>
      <AppUsersChart metric="active_users" className={span.c8} />
      <DevicesCard className={span.c4} />
      <AppUsersChart metric="new_users" className={span.half4} />
      <LanguagesCard className={span.half4} />
      <EngagementCard className={span.c4} />
      <ConfirmFunnelCard className={span.c6} />
      <CancelFunnelCard className={span.c6} />
      <ConsultationsCard className={span.half4} />
      <LoyaltyCard className={span.half4} />
      <DoctorAppCard className={span.c4} />
    </Grid>
  </>
);
