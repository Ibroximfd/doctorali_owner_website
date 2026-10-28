import { Grid, span } from "@/shared/ui/grid";
import { Reveal } from "@/shared/ui/motion/reveal";

import { ForecastChart } from "./forecast-chart";
import { ForecastHero } from "./forecast-hero";
import { ForecastHighlights } from "./forecast-highlights";
import { ForecastRegionsCard } from "./forecast-regions-card";
import { StockoutsCard } from "./stockouts-card";

/**
 * «Prognoz»: tahririy jumla, fakt + prognoz konusi, 3 xulosa, tugaydigan mahsulotlar va hududlar.
 * «Agar shunday qilsangiz» stsenariylari API da yo'q — chizilmaydi.
 */
export const ForecastScreen = () => (
  <>
    <ForecastHero />
    <Grid>
      <ForecastChart className={span.full} />
      <div className={span.full}>
        <ForecastHighlights />
      </div>
      <Reveal className={span.c7}>
        <StockoutsCard />
      </Reveal>
      <Reveal className={span.c5} delay={0.08}>
        <ForecastRegionsCard />
      </Reveal>
    </Grid>
  </>
);
