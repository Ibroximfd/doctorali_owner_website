import { Download } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { FinanceScreen } from "@/features/finance/ui/finance-screen";
import { routes } from "@/shared/config/routes";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { ScopeLink } from "@/shared/ui/scope-link";

export default async function FinancePage() {
  const t = await getTranslations("finance");

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          // Oylik hisobot "Hisobotlar" bo'limida tayyorlanadi — havola tanlangan davr va filial bilan o'tadi.
          <Button asChild>
            <ScopeLink href={routes.reports}>
              <Download aria-hidden />
              {t("monthlyReport")}
            </ScopeLink>
          </Button>
        }
      />
      <FinanceScreen />
    </>
  );
}
