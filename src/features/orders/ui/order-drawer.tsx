"use client";

import { Check, Clock, Lock, PackageSearch, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { useOrderDrawer } from "@/shared/hooks/use-order-drawer";
import { toAppError } from "@/shared/lib/app-error";
import { formatNumber, formatPhone } from "@/shared/lib/format";
import { Banner } from "@/shared/ui/banner";
import { Drawer, DrawerSection } from "@/shared/ui/drawer";
import { KvList, type KvRow } from "@/shared/ui/kv-list";
import { MiniStats } from "@/shared/ui/mini-stats";
import { Pill } from "@/shared/ui/pill";
import { StageBadge } from "@/shared/ui/stage-badge";
import { BlockSkeleton, ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useOrderLabels } from "../hooks/use-order-labels";
import { useOrderQuery } from "../hooks/use-orders";
import { paymentTone, pendingReasonToShow } from "../model/orders.rules";
import type { OrderDetail } from "../model/orders.schema";
import { OrderTimeline } from "./order-timeline";

const DASH = "—";

/** Buyurtma kartasi (`?order=<id>`). Panel layoutida bir marta o'rnatiladi; faqat o'qish. */
export const OrderDrawer = () => {
  const t = useTranslations("orders.drawer");
  const { orderId, closeOrder } = useOrderDrawer();
  const query = useOrderQuery(orderId);
  const order = query.data;
  const isNotFound = order === undefined && query.isError && toAppError(query.error).kind === "not-found";

  return (
    <Drawer
      open={orderId !== null}
      onOpenChange={(open) => {
        if (!open) closeOrder();
      }}
      title={order ? <span className="num">{order.orderNumber}</span> : t("title")}
      subtitle={order ? <OrderBadges order={order} /> : undefined}
    >
      {isNotFound ? (
        <StateBlock icon={PackageSearch} title={t("notFoundTitle")} description={t("notFoundDescription")} />
      ) : (
        <QueryState query={query} skeleton={<OrderSkeleton />} className="flex flex-col gap-4.5">
          {(loaded) => <OrderContent order={loaded} />}
        </QueryState>
      )}
    </Drawer>
  );
};

const OrderSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-4.5">
    <div className="grid grid-cols-2 gap-2.5">
      <BlockSkeleton className="h-16" />
      <BlockSkeleton className="h-16" />
    </div>
    <ListSkeleton rows={4} />
    <ListSkeleton rows={3} />
    <ListSkeleton rows={4} />
  </div>
);

const PAYMENT_ICON = { good: Check, warn: Clock, info: Clock, neutral: undefined } as const;

const OrderBadges = ({ order }: { order: OrderDetail }) => {
  const labels = useOrderLabels();
  const tone = paymentTone(order.payment.status);
  const pendingReason = pendingReasonToShow(order);

  return (
    <>
      <StageBadge status={order.status} />
      <Pill intent={tone} icon={PAYMENT_ICON[tone]}>
        {labels.paymentStatus(order.payment.status)}
      </Pill>
      {pendingReason ? (
        <Pill intent="info" icon={Clock}>
          {labels.pendingReason(pendingReason)}
        </Pill>
      ) : null}
    </>
  );
};

const OrderContent = ({ order }: { order: OrderDetail }) => {
  const t = useTranslations("orders.drawer");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const labels = useOrderLabels();
  const [phone, ...otherPhones] = order.client.phones;

  const clientRows: KvRow[] = [
    { key: "name", label: t("name"), value: order.client.fullName },
    {
      key: "phone",
      label: t("phone"),
      value: <span className="num">{phone ? formatPhone(phone) : DASH}</span>,
      hint: otherPhones.length > 0 ? `+${otherPhones.length}` : undefined,
    },
    {
      key: "region",
      label: t("region"),
      value: labels.region(order.delivery.region, order.delivery.regionDisplay),
    },
    ...(order.delivery.deliveryDate
      ? [
          {
            key: "deliveryDate",
            label: t("deliveryDate"),
            value: (
              <span className="num">{format.date(`${order.delivery.deliveryDate}T12:00:00+05:00`)}</span>
            ),
          },
        ]
      : []),
    {
      key: "app",
      label: t("app"),
      value: order.client.hasApp ? (
        <Pill intent="good" icon={Smartphone}>
          {t("appInstalled")}
        </Pill>
      ) : (
        <Pill>{t("appMissing")}</Pill>
      ),
    },
  ];

  const itemRows: KvRow[] = order.items.map((item) => ({
    key: String(item.id),
    label: t(item.isGift ? "gift" : "item", { name: item.name, quantity: item.quantity }),
    value: <span className="num">{formatNumber(item.price)}</span>,
  }));

  const handledRows: KvRow[] = [
    { key: "source", label: t("source"), value: labels.source(order.source) },
    { key: "operator", label: t("operator"), value: order.responsibleOperator?.name ?? DASH },
    { key: "courier", label: t("courier"), value: order.delivery.courier?.fullName ?? DASH },
    { key: "filial", label: t("filial"), value: order.filial.name },
  ];

  return (
    <>
      <MiniStats
        items={[
          {
            key: "amount",
            label: t("amount"),
            value: formatNumber(order.payableAmount),
            unit: format.currency,
          },
          { key: "method", label: t("paymentMethod"), value: labels.paymentMethod(order.payment.method) },
        ]}
      />
      <DrawerSection title={t("client")}>
        <KvList rows={clientRows} />
        {order.delivery.addressText ? (
          <p className="text-ink-3 mt-1.5 text-xs">{order.delivery.addressText}</p>
        ) : null}
      </DrawerSection>
      <DrawerSection title={t("items")}>
        {itemRows.length > 0 ? (
          <KvList rows={itemRows} />
        ) : (
          <p className="text-ink-3 text-sm">{t("itemsEmpty")}</p>
        )}
      </DrawerSection>
      <DrawerSection title={t("handledBy")}>
        <KvList rows={handledRows} />
      </DrawerSection>
      <DrawerSection title={t("timeline")}>
        <OrderTimeline events={order.timeline} />
      </DrawerSection>
      <Banner icon={Lock}>{tCommon("readOnlyNote")}</Banner>
    </>
  );
};
