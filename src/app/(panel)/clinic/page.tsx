import { getTranslations } from "next-intl/server";

import { ClinicScreen } from "@/features/clinic/ui/clinic-screen";
import { ClinicSubtitle } from "@/features/clinic/ui/clinic-subtitle";
import { PageHeader } from "@/shared/ui/page-header";

export default async function ClinicPage() {
  const t = await getTranslations("clinic");

  return (
    <>
      <PageHeader title={t("title")} description={<ClinicSubtitle />} />
      <ClinicScreen />
    </>
  );
}
