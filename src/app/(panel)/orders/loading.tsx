import { Grid, span } from "@/shared/ui/grid";
import { BlockSkeleton, StatRowSkeleton } from "@/shared/ui/states";

/** "Buyurtmalar" yuklanayotganda: sahifaning haqiqiy joylashuvi shaklidagi skeleton. */
export default function OrdersLoading() {
  return (
    <div aria-busy="true">
      <BlockSkeleton className="mb-4 h-12 w-64" />
      <StatRowSkeleton />
      <Grid>
        <BlockSkeleton className={`h-80 ${span.c7}`} />
        <BlockSkeleton className={`h-80 ${span.c5}`} />
        <BlockSkeleton className={`h-64 ${span.half4}`} />
        <BlockSkeleton className={`h-64 ${span.half4}`} />
        <BlockSkeleton className={`h-64 ${span.c4}`} />
      </Grid>
    </div>
  );
}
