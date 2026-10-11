import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";
import { Grid, span } from "@/shared/ui/grid";

import { AccessCard } from "./access-card";
import { SecurityCard } from "./security-card";
import { TargetsCard } from "./targets-card";

type SettingsScreenProps = {
  /**
   * "Signal chegaralari" kartasi `alerts` featuresiniki. Feature featureni
   * import qilmaydi — kartani sahifa (`app`) beradi, bu yerda faqat joyi bor.
   */
  alertRules: ReactNode;
};

/** "Sozlamalar" sahifasi: boshliqning o'z sozlamalari — reja, chegaralar, kirish huquqlari, xavfsizlik. */
export const SettingsScreen = ({ alertRules }: SettingsScreenProps) => (
  <Grid>
    <TargetsCard className={span.c6} />
    {/* `grid` — ichidagi karta qo'shni karta bilan bir xil balandlikka cho'ziladi. */}
    <div className={cn(span.c6, "grid min-w-0")}>{alertRules}</div>
    <AccessCard className={span.c6} />
    <SecurityCard className={span.c6} />
  </Grid>
);
