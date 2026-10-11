"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Banner } from "@/shared/ui/banner";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Funnel, type FunnelStep } from "@/shared/ui/funnel";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import { useAppFunnelsQuery } from "../hooks/use-mobile-app";
import {
  cancelFunnelSteps,
  confirmFunnelSteps,
  retainedOrders,
  type FunnelCount,
} from "../model/mobile-app.rules";

/** Qadamlar bitta rangda (uzunlikning o'zi qiymat); faqat yakuniy qadam o'z natijasi rangida. */
const STEP_COLOR = "bg-series-1";

const toFunnelSteps = <Key extends string>(
  steps: readonly FunnelCount<Key>[],
  label: (key: Key) => string,
  finalColorClassName: string,
): FunnelStep[] =>
  steps.map((step, index) => ({
    key: step.key,
    label: label(step.key),
    count: step.count,
    colorClassName: index === steps.length - 1 ? finalColorClassName : STEP_COLOR,
  }));

const isFunnelEmpty = (steps: readonly FunnelCount<string>[]): boolean => (steps[0]?.count ?? 0) === 0;

const strong = (chunks: ReactNode) => <b className="text-ink font-semibold">{chunks}</b>;

/** Operator yaratgan buyurtmani mijoz ilovada tasdiqlaydi: push → ochdi → surdi → to'lov → tasdiq. */
export const ConfirmFunnelCard = ({ className }: { className?: string }) => {
  const t = useTranslations("mobileApp.confirmFunnel");
  const query = useAppFunnelsQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={5} />}
          isEmpty={({ data }) => isFunnelEmpty(confirmFunnelSteps(data.confirm))}
        >
          {({ data }) => (
            <Funnel
              steps={toFunnelSteps(
                confirmFunnelSteps(data.confirm),
                (key) => t(`steps.${key}`),
                "bg-order-delivered",
              )}
              renderTransition={(passedPercent, lost) =>
                t.rich("transition", { pct: passedPercent, lost: formatNumber(lost), b: strong })
              }
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};

/** 3 bosqichli ushlab qolish oqimi: bekor qilishni boshlaganlarning qanchasi fikridan qaytdi. */
export const CancelFunnelCard = ({ className }: { className?: string }) => {
  const t = useTranslations("mobileApp.cancelFunnel");
  const query = useAppFunnelsQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={4} />}
          isEmpty={({ data }) => isFunnelEmpty(cancelFunnelSteps(data.cancel))}
        >
          {({ data }) => {
            const retained = retainedOrders(data.cancel);
            return (
              <>
                <Funnel
                  steps={toFunnelSteps(
                    cancelFunnelSteps(data.cancel),
                    (key) => t(`steps.${key}`),
                    "bg-order-cancelled",
                  )}
                  renderTransition={(passedPercent) =>
                    t.rich("transition", { pct: passedPercent, b: strong })
                  }
                />
                <Banner icon={ShieldCheck} className="mt-3.5">
                  {t.rich("retained", {
                    count: formatNumber(retained.count),
                    pct: formatPercent(retained.pct),
                    b: strong,
                  })}
                </Banner>
              </>
            );
          }}
        </QueryState>
      </CardBody>
    </Card>
  );
};
