import { getTranslations } from "next-intl/server";

import { ProductsScreen } from "@/features/products/ui/products-screen";
import { PageHeader } from "@/shared/ui/page-header";

export default async function ProductsPage() {
  const [tNav, t] = await Promise.all([getTranslations("nav"), getTranslations("products")]);

  return (
    <>
      <PageHeader title={tNav("items.products")} description={t("description")} />
      <ProductsScreen />
    </>
  );
}
