"use client";

import { Clock, Hourglass, Inbox, Lock, RefreshCw, SearchX, TriangleAlert, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useOnline } from "@/shared/hooks/use-online";
import type { AppError } from "@/shared/lib/app-error";

import { Banner } from "../banner";
import { Button } from "../button";
import { StateBlock } from "./state-block";

/** Davrda umuman ma'lumot yo'q. */
export const EmptyState = ({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) => {
  const t = useTranslations("common.states");
  return (
    <StateBlock
      icon={Inbox}
      title={title ?? t("emptyTitle")}
      description={description ?? t("emptyDescription")}
      action={action}
    />
  );
};

/** Filtr yoki qidiruv hech narsa topmadi. */
export const NoResults = ({ query, onClear }: { query?: string; onClear?: () => void }) => {
  const t = useTranslations("common.states");
  return (
    <StateBlock
      icon={SearchX}
      title={query ? t("noResultsFor", { query }) : t("noResultsTitle")}
      description={t("noResultsDescription")}
      action={
        onClear ? (
          <Button size="sm" onClick={onClear}>
            {t("clearFilters")}
          </Button>
        ) : undefined
      }
    />
  );
};

/** Bitta blokning xatosi: tushunarli gap + o'sha so'rovni qayta urinish. */
export const ErrorState = ({ error, onRetry }: { error: AppError; onRetry?: () => void }) => {
  const t = useTranslations("common.errors");
  return (
    <StateBlock
      icon={TriangleAlert}
      tone="crit"
      title={t("title")}
      description={t(`kind.${error.kind}`)}
      action={
        onRetry ? (
          <Button size="sm" onClick={onRetry}>
            <RefreshCw aria-hidden />
            {t("retry")}
          </Button>
        ) : undefined
      }
    />
  );
};

/** Ma'lumot manbai backendda hali yoqilmagan — xato emas, qayta urinish ham kerak emas. */
export const SourcePendingState = () => {
  const t = useTranslations("common.states");
  return <StateBlock icon={Hourglass} title={t("pendingTitle")} description={t("pendingDescription")} />;
};

/** Bo'lim foydalanuvchiga ochilmagan (`owner_viewer`). */
export const ForbiddenState = () => {
  const t = useTranslations("common.states");
  return <StateBlock icon={Lock} title={t("forbiddenTitle")} description={t("forbiddenDescription")} />;
};

/** Internet yo'q: neytral tasma, keshdagi kontent ostida ko'rinib turadi. */
export const OfflineBanner = ({ className }: { className?: string }) => {
  const t = useTranslations("common.states");
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className={className}>
      <Banner icon={WifiOff}>{t("offline")}</Banner>
    </div>
  );
};

/** Ma'lumot eskirgan (yangilanish muvaffaqiyatsiz yoki manba kechikmoqda). */
export const StaleNote = ({ children }: { children?: ReactNode }) => {
  const t = useTranslations("common.states");
  return (
    <div role="status" className="text-2xs text-warn mb-2 flex items-center gap-1.5">
      <Clock aria-hidden className="size-3.5" />
      {children ?? t("stale")}
    </div>
  );
};
