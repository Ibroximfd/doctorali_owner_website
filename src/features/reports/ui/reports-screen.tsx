import { Grid, span } from "@/shared/ui/grid";

import { DigestCard } from "./digest-card";
import { ExportHistoryCard } from "./export-history-card";
import { ReadyReportsCard } from "./ready-reports-card";

type ReportsScreenProps = {
  /** Kutilayotgan eksport holatini so'rash oralig'i (sukutda 2 soniya). */
  pollIntervalMs?: number;
};

/** "Hisobotlar" sahifasi: tayyor hisobotlar, Telegram xulosa va eksport tarixi. */
export const ReportsScreen = ({ pollIntervalMs }: ReportsScreenProps) => (
  <Grid>
    <ReadyReportsCard className={span.c7} />
    <DigestCard className={span.c5} />
    <ExportHistoryCard className={span.full} pollIntervalMs={pollIntervalMs} />
  </Grid>
);
