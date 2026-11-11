import { getTranslations } from "next-intl/server";

import { DistrictChangesScreen } from "@/features/districts/ui/district-changes-screen";
import { PageHeader } from "@/shared/ui/page-header";

export default async function DistrictsPage() {
  const t = await getTranslations("districts");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <DistrictChangesScreen />
    </>
  );
}
