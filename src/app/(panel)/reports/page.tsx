import { getTranslations } from "next-intl/server";

import { ReportsScreen } from "@/features/reports/ui/reports-screen";
import { PageHeader } from "@/shared/ui/page-header";

export default async function ReportsPage() {
  const t = await getTranslations("reports");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <ReportsScreen />
    </>
  );
}
