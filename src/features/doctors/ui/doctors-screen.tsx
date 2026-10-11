import { Grid, span } from "@/shared/ui/grid";

import { DoctorsKpis } from "./doctors-kpis";
import { DoctorsRanking } from "./doctors-ranking";

/** "Shifokorlar" sahifasi: 4 ko'rsatkich va sotuv bo'yicha reyting. Har blok o'z holatlarini o'zi ko'rsatadi. */
export const DoctorsScreen = () => (
  <>
    <DoctorsKpis />
    <Grid>
      <DoctorsRanking className={span.full} />
    </Grid>
  </>
);
