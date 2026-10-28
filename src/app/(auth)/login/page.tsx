import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/features/auth/ui/login-form";
import { AmbientBackground } from "@/shared/ui/ambient-background";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("title") };
}

type LoginPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <main className="relative isolate grid min-h-dvh place-items-center px-4 py-6">
      <AmbientBackground />
      <div
        aria-hidden
        className="bg-accent/10 absolute top-1/4 left-1/2 -z-10 size-96 -translate-x-1/2 rounded-full blur-3xl"
      />
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </main>
  );
}
