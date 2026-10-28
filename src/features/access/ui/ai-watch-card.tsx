"use client";

import { ShieldCheck, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

import { useAccessTab } from "../hooks/use-iam";
import { unusedLeader } from "../model/iam.rules";
import type { Account } from "../model/iam.schema";

/**
 * AI kuzatuvi: 30 kun ishlatilmagan ruxsatlari eng ko'p bo'lgan faol akkaunt (`unused_permissions`) —
 * boshliq bir bosishda akkauntni ochib, ortiqchasini olib tashlaydi. Topilma bo'lmasa — tinch holat.
 */
export const AiWatchCard = ({
  accounts,
  className,
}: {
  accounts: readonly Account[];
  className?: string;
}) => {
  const t = useTranslations("access.ai");
  const relative = useRelativeTime();
  const { openAccount } = useAccessTab();
  const target = unusedLeader(accounts);

  return (
    <section
      aria-label={t("title")}
      className={cn(
        "rounded-3xl border p-5",
        target ? "bg-gold/5 border-gold/25" : "panel-surface",
        className,
      )}
    >
      <h2 className={cn("flex items-center gap-2 text-sm font-bold", target ? "text-gold" : "text-ink")}>
        {target ? (
          <Sparkles aria-hidden className="size-4" />
        ) : (
          <ShieldCheck aria-hidden className="text-good size-4" />
        )}
        {t("title")}
      </h2>
      <p className="text-ink-2 text-md mt-2 leading-relaxed">
        {target
          ? t("finding", {
              name: target.fullName,
              count: target.unusedPermissions.length,
              seen: target.lastLoginAt ? relative(target.lastLoginAt) : t("never"),
            })
          : t("calm")}
      </p>
      {target ? (
        <Button intent="outline" className="mt-3.5" onClick={() => openAccount(target.id)}>
          {t("review")}
        </Button>
      ) : null}
    </section>
  );
};
