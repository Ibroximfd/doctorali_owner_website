import { getTranslations } from "next-intl/server";

import { LogisticsScreen } from "@/features/logistics/ui/logistics-screen";
import { PageHeader } from "@/shared/ui/page-header";

export default async function LogisticsPage() {
  const t = await getTranslations("logistics");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <LogisticsScreen />
    </>
  );
}
