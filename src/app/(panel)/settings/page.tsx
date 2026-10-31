import { getTranslations } from "next-intl/server";

import { SettingsScreen } from "@/features/settings/ui/settings-screen";
import { readTwoFactorMethod } from "@/shared/lib/session.server";
import { PageHeader } from "@/shared/ui/page-header";

export default async function SettingsPage() {
  const t = await getTranslations("settings");

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <SettingsScreen twoFactor={await readTwoFactorMethod()} />
    </>
  );
}
