import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/features/auth/ui/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("title") };
}

type LoginPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-6">
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </main>
  );
}
