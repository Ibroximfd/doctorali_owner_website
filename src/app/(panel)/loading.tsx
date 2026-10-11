import { Grid, span } from "@/shared/ui/grid";
import { BlockSkeleton, StatRowSkeleton } from "@/shared/ui/states";

/** Sahifa yuklanayotganda: haqiqiy joylashuv shaklidagi skeleton. */
export default function PanelLoading() {
  return (
    <div aria-busy="true">
      <BlockSkeleton className="mb-4 h-12 w-64" />
      <StatRowSkeleton />
      <Grid>
        <BlockSkeleton className={`h-72 ${span.c8}`} />
        <BlockSkeleton className={`h-72 ${span.c4}`} />
      </Grid>
    </div>
  );
}
