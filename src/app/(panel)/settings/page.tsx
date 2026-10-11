import { getTranslations } from "next-intl/server";

import { AlertRulesCard } from "@/features/alerts/ui/alert-rules-card";
import { SettingsScreen } from "@/features/settings/ui/settings-screen";
import { PageHeader } from "@/shared/ui/page-header";

export default async function SettingsPage() {
  const t = await getTranslations("settings");

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      {/* Signal chegaralari — `alerts` featuresiniki; ikki feature shu yerda (kompozitsiya nuqtasida) birlashadi. */}
      <SettingsScreen alertRules={<AlertRulesCard />} />
    </>
  );
}
