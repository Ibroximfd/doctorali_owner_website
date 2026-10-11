import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TelegramEntryScreen } from "./telegram-entry-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("telegram");
  return { title: t("title") };
}

type TelegramPageProps = { searchParams: Promise<{ next?: string | string[] }> };

/** Telegram mini app kirish nuqtasi: bot tugmasi shu manzilni ochadi. */
export default async function TelegramPage({ searchParams }: TelegramPageProps) {
  const { next } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-6">
      <TelegramEntryScreen next={typeof next === "string" ? next : undefined} />
    </main>
  );
}
