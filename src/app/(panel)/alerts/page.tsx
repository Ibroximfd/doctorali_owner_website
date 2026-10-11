import { SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AlertsScreen } from "@/features/alerts/ui/alerts-screen";
import { routes } from "@/shared/config/routes";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { ScopeLink } from "@/shared/ui/scope-link";

export default async function AlertsPage() {
  const t = await getTranslations("alerts");

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild>
            <ScopeLink href={routes.settings}>
              <SlidersHorizontal aria-hidden />
              {t("configure")}
            </ScopeLink>
          </Button>
        }
      />
      <AlertsScreen />
    </>
  );
}
