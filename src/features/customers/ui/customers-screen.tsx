import { Grid, span } from "@/shared/ui/grid";

import { CohortTable } from "./cohort-table";
import { CustomerRegionsCard } from "./customer-regions-card";
import { CustomersKpis } from "./customers-kpis";
import { CustomersMix } from "./customers-mix";
import { TopCustomersTable } from "./top-customers-table";

/** "Mijozlar": mijoz qaytib kelyaptimi. Har blok o'z holatlarini o'zi ko'rsatadi. */
export const CustomersScreen = () => (
  <>
    <CustomersKpis />
    <Grid>
      <CohortTable className={span.c7} />
      <CustomersMix className={span.c5} />
      <TopCustomersTable className={span.c7} />
      <CustomerRegionsCard className={span.c5} />
    </Grid>
  </>
);
