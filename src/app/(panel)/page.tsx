import { AiHighlights } from "@/features/ai/ui/ai-highlights";
import { OverviewScreen } from "@/features/overview/ui/overview-screen";

import { TodayLine } from "./today-line";

/** Bosh sahifa «Umumiy»: bo'lim o'zi, AI xulosasi esa `ai` featuresidan — shu yerda yig'iladi. */
export default function OverviewPage() {
  return (
    <>
      <OverviewScreen dateline={<TodayLine />} aiSlot={<AiHighlights />} />
    </>
  );
}
