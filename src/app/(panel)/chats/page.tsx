import { getTranslations } from "next-intl/server";

import { ChatsScreen } from "@/features/chats/ui/chats-screen";
import { PageHeader } from "@/shared/ui/page-header";

export default async function ChatsPage() {
  const t = await getTranslations("chats");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <ChatsScreen />
    </>
  );
}
