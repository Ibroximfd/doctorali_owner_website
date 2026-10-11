import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { StatesScreen } from "@/features/states/ui/states-screen";
import { env } from "@/shared/config/env";
import { PageHeader } from "@/shared/ui/page-header";

export default async function StatesPage() {
  // Galereya dizayn tekshiruvi uchun: haqiqiy ma'lumot rejimida bunday sahifa yo'q (menyuda ham ko'rinmaydi).
  if (!env.isMocking) notFound();

  const t = await getTranslations("states");

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <StatesScreen />
    </>
  );
}
