import { useTranslations } from "next-intl";

import { isOrderStatus, orderStatusStyle } from "@/shared/config/order-status";
import { cn } from "@/shared/lib/cn";

/** Buyurtma bosqichi: rangli nuqta + nom. Noma'lum qiymat "noma'lum" deb ko'rsatiladi. */
export const StageBadge = ({ status, className }: { status: string; className?: string }) => {
  const t = useTranslations("common.orderStatus");
  return (
    <span className={cn("font-mid inline-flex items-center gap-1.5 text-xs whitespace-nowrap", className)}>
      <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", orderStatusStyle(status).dot)} />
      {isOrderStatus(status) ? t(status) : t("unknown")}
    </span>
  );
};
