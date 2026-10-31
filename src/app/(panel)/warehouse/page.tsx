import { getTranslations } from "next-intl/server";

import { WarehouseScreen } from "@/features/warehouse/ui/warehouse-screen";
import { PageHeader } from "@/shared/ui/page-header";

export default async function WarehousePage() {
  const t = await getTranslations("warehouse");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <WarehouseScreen />
    </>
  );
}
