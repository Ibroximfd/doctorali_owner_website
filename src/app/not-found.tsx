import { SearchX } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { routes } from "@/shared/config/routes";
import { Button } from "@/shared/ui/button";
import { StateBlock } from "@/shared/ui/states";

export default async function NotFound() {
  const t = await getTranslations("common.notFound");

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <StateBlock
        icon={SearchX}
        title={t("title")}
        description={t("description")}
        action={
          <Button asChild intent="primary">
            <Link href={routes.overview}>{t("home")}</Link>
          </Button>
        }
      />
    </main>
  );
}
