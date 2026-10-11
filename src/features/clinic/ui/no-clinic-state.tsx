"use client";

import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { StateBlock } from "@/shared/ui/states";

type NoClinicStateProps = {
  /** Tanlangan (klinikasiz) filiallar nomlari. */
  filialNames: readonly string[];
  onShowAll: () => void;
};

/** Tanlangan filiallarda klinika yo'q: sababini aytadi va filtrni tozalashni taklif qiladi. */
export const NoClinicState = ({ filialNames, onShowAll }: NoClinicStateProps) => {
  const t = useTranslations("clinic.noClinic");
  const [onlyName] = filialNames;
  const isSingle = filialNames.length === 1 && onlyName !== undefined;

  return (
    <Card>
      <StateBlock
        className="min-h-80"
        icon={Building2}
        title={isSingle ? t("titleOne", { name: onlyName }) : t("titleMany")}
        description={isSingle ? t("descriptionOne") : t("descriptionMany")}
        action={<Button onClick={onShowAll}>{t("showAll")}</Button>}
      />
    </Card>
  );
};
