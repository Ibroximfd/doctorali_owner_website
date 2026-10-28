import type { ReactNode } from "react";

import { Grid, span } from "@/shared/ui/grid";
import { Reveal } from "@/shared/ui/motion/reveal";

import { MovementsChart } from "./movements-chart";
import { SalesMixCard } from "./sales-mix-card";
import { StockRunway } from "./stock-runway";
import { StockTable } from "./stock-table";
import { WarehouseDrawer } from "./warehouse-drawer";
import { WarehouseHero } from "./warehouse-hero";
import { WarehouseKpis } from "./warehouse-kpis";
import { WarehousesGrid } from "./warehouses-grid";

/** «Ombor» sahifasi: omborlar «idish»lari → chiqim oqimi → tugash vaqti → qoldiq jadvali. Har blok o'z holatlarini o'zi ko'rsatadi. */
/** `regionSlot` — hudud xaritasi (`features/regions`), kompozitsiya `app` da. */
export const WarehouseScreen = ({ regionSlot }: { regionSlot?: ReactNode }) => (
  <>
    <WarehouseHero />
    <WarehouseKpis />
    <Grid>
      {regionSlot ? <div className={span.full}>{regionSlot}</div> : null}
      <WarehousesGrid className={span.full} />
      <Reveal className={span.full}>
        <SalesMixCard />
      </Reveal>
      <Reveal className={span.full}>
        <StockRunway />
      </Reveal>
      <Reveal className={span.full}>
        <StockTable />
      </Reveal>
      <Reveal className={span.full}>
        <MovementsChart />
      </Reveal>
    </Grid>
    <WarehouseDrawer />
  </>
);
