import { getTranslations } from "next-intl/server";

import { OverviewScreen } from "@/features/overview/ui/overview-screen";
import { PageHeader } from "@/shared/ui/page-header";

import { TodayLine } from "./today-line";

export default async function OverviewPage() {
  const t = await getTranslations("overview");

  return (
    <>
      <PageHeader title={t("title")} description={<TodayLine />} />
      <OverviewScreen />
    </>
  );
}
