import { getTranslations } from "next-intl/server";

import { RatingsScreen } from "@/features/ratings/ui/ratings-screen";
import { PageHeader } from "@/shared/ui/page-header";

export default async function RatingsPage() {
  const t = await getTranslations("ratings");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <RatingsScreen />
    </>
  );
}
