import { getTranslations } from "next-intl/server";

import { DoctorsScreen } from "@/features/doctors/ui/doctors-screen";
import { PageHeader } from "@/shared/ui/page-header";

export default async function DoctorsPage() {
  const t = await getTranslations("doctors");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <DoctorsScreen />
    </>
  );
}
