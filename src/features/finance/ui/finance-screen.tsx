import { Grid, span } from "@/shared/ui/grid";

import { CashPositionCard } from "./cash-position-card";
import { CashflowCard } from "./cashflow-card";
import { ClosingsCard } from "./closings-card";
import { DebtsCard } from "./debts-card";
import { ExpensesCard } from "./expenses-card";
import { FinanceKpis } from "./finance-kpis";
import { LiabilitiesCard } from "./liabilities-card";
import { PaymentMixCard } from "./payment-mix-card";

/** "Moliya" sahifasi: pul qancha va qayerda. Har blok o'z holatlarini o'zi ko'rsatadi. */
export const FinanceScreen = () => (
  <>
    <FinanceKpis />
    <Grid>
      <CashflowCard className={span.c8} />
      <CashPositionCard className={span.c4} />
      <PaymentMixCard className={span.half4} />
      <ExpensesCard className={span.half4} />
      <LiabilitiesCard className={span.c4} />
      <DebtsCard className={span.c6} />
      <ClosingsCard className={span.c6} />
    </Grid>
  </>
);
