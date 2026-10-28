"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  CreditCard,
  Database,
  HardDrive,
  Layers,
  MessageSquareText,
  Network,
  Send,
  Server,
  ShoppingBag,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { BlockSkeleton, QueryState } from "@/shared/ui/states";

import { useHealthQuery } from "../hooks/use-system";
import {
  isComponentKey,
  isHealthStatus,
  lagParts,
  sortComponents,
  type ComponentKey,
} from "../model/system.rules";
import type { HealthComponent } from "../model/system.schema";

const COMPONENT_ICON: Record<ComponentKey, LucideIcon> = {
  database: Database,
  api: Server,
  queue: Layers,
  cache: Zap,
  bitrix: Workflow,
  marketplace_erp: ShoppingBag,
  telegram: Send,
  sms: MessageSquareText,
  payments: CreditCard,
  storage: HardDrive,
};

const LIGHT = { ok: "bg-good", degraded: "bg-warn", down: "bg-crit" } as const;

const ComponentTile = ({ component, index }: { component: HealthComponent; index: number }) => {
  const t = useTranslations("system.components");
  const relative = useRelativeTime();
  const reduce = useReducedMotion();
  const Icon = isComponentKey(component.key) ? COMPONENT_ICON[component.key] : Network;
  const status = isHealthStatus(component.status) ? component.status : null;
  const lag = component.lagSeconds === null ? null : lagParts(component.lagSeconds);

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: EASE_OUT, delay: index * 0.04 }}
      className={cn(
        "panel-surface flex flex-col gap-2 rounded-2xl border p-4",
        status === "down" && "border-crit bg-crit-soft/40",
        status === "degraded" && "border-warn",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="bg-surface-3 text-ink-2 grid size-9 place-items-center rounded-lg">
          <Icon aria-hidden className="size-4.5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {isComponentKey(component.key) ? t(`names.${component.key}`) : component.key}
        </span>
        <span className="relative flex size-2.5" aria-hidden>
          {status && status !== "ok" ? (
            <span className={cn("animate-ping-soft absolute inset-0 rounded-full", LIGHT[status])} />
          ) : null}
          <span className={cn("relative size-2.5 rounded-full", status ? LIGHT[status] : "bg-ink-3")} />
        </span>
      </div>
      <div className="text-xs font-medium">{status ? t(`status.${status}`) : component.status}</div>
      <dl className="text-2xs text-ink-3 grid grid-cols-2 gap-1">
        {component.latencyMs === null ? null : (
          <div>
            <dt className="inline">{t("latency")}: </dt>
            <dd className="num inline">{formatNumber(component.latencyMs)} ms</dd>
          </div>
        )}
        {lag === null ? null : (
          <div>
            <dt className="inline">{t("lag")}: </dt>
            <dd className="num inline">{t(`lagUnit.${lag.unit}`, { value: lag.value })}</dd>
          </div>
        )}
        {component.lastSuccessAt ? (
          <div className="col-span-2">
            <dt className="inline">{t("lastOk")}: </dt>
            <dd className="inline">{relative(component.lastSuccessAt)}</dd>
          </div>
        ) : null}
      </dl>
      {component.lastError ? (
        <p className="text-crit text-2xs bg-crit-soft rounded-md px-2 py-1">{component.lastError}</p>
      ) : null}
    </motion.li>
  );
};

/** Har bir komponent — chiroq (yashil/sariq/qizil), kechikish va oxirgi xato. Muammolisi tepada. */
export const ComponentsGrid = ({ className }: { className?: string }) => {
  const t = useTranslations("system.components");
  const query = useHealthQuery();
  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<BlockSkeleton className="h-56" />}
          isEmpty={(health) => health.components.length === 0}
        >
          {(health) => (
            <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
              {sortComponents(health.components).map((component, index) => (
                <ComponentTile key={component.key} component={component} index={index} />
              ))}
            </ul>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};
