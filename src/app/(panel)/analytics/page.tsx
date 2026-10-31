import { getTranslations } from "next-intl/server";

import { AnalyticsScreen } from "@/features/analytics/ui/analytics-screen";
import { PageHeader } from "@/shared/ui/page-header";

import { SourceFilter } from "@/shared/ui/source-filter";

export default async function AnalyticsPage() {
  const t = await getTranslations("analytics");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={<SourceFilter />} />
      <AnalyticsScreen />
    </>
  );
}
