"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { seriesBg } from "@/shared/config/chart-palette";
import { routes } from "@/shared/config/routes";
import { useFormat } from "@/shared/hooks/use-format";
import { Banner } from "@/shared/ui/banner";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { CardLink } from "@/shared/ui/card-link";
import { StackedBar } from "@/shared/ui/stacked-bar";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useOverviewQuery } from "../hooks/use-overview";

/** "Pul qayerda": kassa, kuryerlar, onlayn hisob va mijozlar qarzi — hozirgi holat. */
export const CashPositionCard = ({ className }: { className?: string }) => {
  const t = useTranslations("overview.cash");
  const format = useFormat();
  const query = useOverviewQuery();

  return (
    <Card className={className}>
      <CardHeader
        title={t("title")}
        description={t("description")}
        action={<CardLink href={routes.finance}>{t("link")}</CardLink>}
      />
      <CardBody>
        <QueryState query={query} skeleton={<ListSkeleton rows={4} />}>
          {({ data: { cashPosition } }) => (
            <>
              <StackedBar
                legend="column"
                ariaLabel={t("title")}
                format={format.moneyCompact}
                items={[
                  {
                    key: "tills",
                    label: t("items.tills"),
                    value: cashPosition.clinicTills,
                    colorClassName: seriesBg(0),
                  },
                  {
                    key: "cod",
                    label: t("items.cod"),
                    value: cashPosition.courierCod,
                    colorClassName: seriesBg(1),
                  },
                  {
                    key: "online",
                    label: t("items.online"),
                    value: cashPosition.onlineReceived,
                    colorClassName: seriesBg(2),
                  },
                  {
                    key: "debt",
                    label: t("items.debt"),
                    value: cashPosition.openDebt,
                    colorClassName: seriesBg(3),
                  },
                ]}
              />
              {cashPosition.overdueDebt > 0 ? (
                <Banner icon={TriangleAlert} className="mt-3">
                  {t.rich("overdue", {
                    value: format.money(cashPosition.overdueDebt),
                    b: (chunks) => <b className="text-ink font-semibold">{chunks}</b>,
                  })}
                </Banner>
              ) : null}
            </>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
