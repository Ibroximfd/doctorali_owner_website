/**
 * Buyurtma bosqichlari — platforma shartnomasi (`02_DOMAIN_MODEL…` §2.1).
 * Noma'lum qiymat `pending` deb emas, "noma'lum" deb ko'rsatiladi.
 */
export const ORDER_STATUSES = ["pending", "confirmed", "shipping", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const isOrderStatus = (value: string): value is OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(value);

type StatusStyle = { dot: string; bar: string; cssVar: string };

/** Tailwind klasslari to'liq yozilgan — dinamik qurilsa kompilyator ularni topmaydi. */
export const ORDER_STATUS_STYLE: Record<OrderStatus, StatusStyle> = {
  pending: { dot: "bg-order-pending", bar: "bg-order-pending", cssVar: "var(--order-pending)" },
  confirmed: { dot: "bg-order-confirmed", bar: "bg-order-confirmed", cssVar: "var(--order-confirmed)" },
  shipping: { dot: "bg-order-shipping", bar: "bg-order-shipping", cssVar: "var(--order-shipping)" },
  delivered: { dot: "bg-order-delivered", bar: "bg-order-delivered", cssVar: "var(--order-delivered)" },
  cancelled: { dot: "bg-order-cancelled", bar: "bg-order-cancelled", cssVar: "var(--order-cancelled)" },
};

export const UNKNOWN_STATUS_STYLE: StatusStyle = { dot: "bg-ink-3", bar: "bg-ink-3", cssVar: "var(--ink-3)" };

export const orderStatusStyle = (status: string): StatusStyle =>
  isOrderStatus(status) ? ORDER_STATUS_STYLE[status] : UNKNOWN_STATUS_STYLE;
