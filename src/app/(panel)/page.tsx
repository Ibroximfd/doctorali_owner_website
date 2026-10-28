import { FeedTicker } from "@/features/overview/ui/feed-ticker";
import { OverviewBrief } from "@/features/overview/ui/overview-brief";
import { OverviewScreen } from "@/features/overview/ui/overview-screen";
import { RegionExplorer } from "@/features/regions/ui/region-explorer";

import { AiBrief } from "./ai-brief";
import { TodayLine } from "./today-line";

/**
 * Bosh sahifa: tahririy «brief» (`h1`) + AI brifingi, so'ng hudud xaritasi sahnasi — ostida
 * jonli lenta tasmasi. Har feature o'z bo'lagini beradi, ular shu yerda yig'iladi.
 */
export default function OverviewPage() {
  return (
    <>
      <OverviewBrief dateline={<TodayLine />} aside={<AiBrief />} />
      <OverviewScreen regionSlot={<RegionExplorer footer={<FeedTicker />} />} />
    </>
  );
}
