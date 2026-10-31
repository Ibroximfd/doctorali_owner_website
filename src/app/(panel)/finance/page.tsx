import { getTranslations } from "next-intl/server";

import { FinanceScreen } from "@/features/finance/ui/finance-screen";
import { PageHeader } from "@/shared/ui/page-header";

import { SourceFilter } from "@/shared/ui/source-filter";

export default async function FinancePage() {
  const t = await getTranslations("finance");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={<SourceFilter />} />
      <FinanceScreen />
    </>
  );
}
