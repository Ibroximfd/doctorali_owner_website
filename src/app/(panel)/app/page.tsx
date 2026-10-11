import { getTranslations } from "next-intl/server";

import { MobileAppScreen } from "@/features/mobile-app/ui/mobile-app-screen";
import { PageHeader } from "@/shared/ui/page-header";

export default async function AppPage() {
  const t = await getTranslations("mobileApp");

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <MobileAppScreen />
    </>
  );
}
