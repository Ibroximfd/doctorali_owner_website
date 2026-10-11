import { getTranslations } from "next-intl/server";

import { CustomersScreen } from "@/features/customers/ui/customers-screen";
import { PageHeader } from "@/shared/ui/page-header";

export default async function CustomersPage() {
  const [tNav, t] = await Promise.all([getTranslations("nav"), getTranslations("customers")]);

  return (
    <>
      <PageHeader title={tNav("items.customers")} description={t("description")} />
      <CustomersScreen />
    </>
  );
}
