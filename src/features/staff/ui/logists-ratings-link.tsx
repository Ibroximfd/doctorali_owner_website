"use client";

import { ArrowRight, Route } from "lucide-react";
import { useTranslations } from "next-intl";

import { routes } from "@/shared/config/routes";
import { Card, CardBody } from "@/shared/ui/card";
import { ScopeLink } from "@/shared/ui/scope-link";
import { StateBlock } from "@/shared/ui/states";

/**
 * Logistlar ish natijasi (tasdiqlash tezligi, yakunlangan zakazlar) — «Reytinglar» bo'limida
 * (`ratings/logists/`, TZ 32 §A-3a). Xodimlar bo'limida alohida manba yo'q, shuning uchun bu yerda
 * o'sha yorliqqa to'g'ridan-to'g'ri havola.
 */
export const LogistsRatingsLink = () => {
  const t = useTranslations("staff.logists");
  return (
    <Card>
      <CardBody>
        <StateBlock
          icon={Route}
          title={t("title")}
          description={t("description")}
          action={
            <ScopeLink
              href={`${routes.ratings}?tab=logists`}
              className="text-accent inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
            >
              {t("open")}
              <ArrowRight aria-hidden className="size-4" />
            </ScopeLink>
          }
        />
      </CardBody>
    </Card>
  );
};
