import { getTranslations } from "next-intl/server";

import { SalesScreen } from "@/features/sales/ui/sales-screen";
import { PageHeader } from "@/shared/ui/page-header";

export default async function SalesPage() {
  const [tNav, t] = await Promise.all([getTranslations("nav"), getTranslations("sales")]);

  return (
    <>
      <PageHeader title={tNav("items.sales")} description={t("description")} />
      <SalesScreen />
    </>
  );
}
