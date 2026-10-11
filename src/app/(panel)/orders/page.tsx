import { getTranslations } from "next-intl/server";

import { OrdersScreen } from "@/features/orders/ui/orders-screen";
import { PageHeader } from "@/shared/ui/page-header";

export default async function OrdersPage() {
  const t = await getTranslations("orders");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <OrdersScreen />
    </>
  );
}
