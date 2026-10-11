"use client";

import { parseAsString, useQueryState } from "nuqs";

/**
 * Buyurtma kartasi URL parametri (`?order=<id>`) orqali ochiladi: havola
 * ulashiladi, "orqaga" tugmasi yopadi. Istalgan bo'lim shu hook bilan ochadi —
 * kartaning o'zi `orders` featuresida, panel layoutida bir marta o'rnatilgan.
 */
export const useOrderDrawer = () => {
  const [orderId, setOrderId] = useQueryState("order", parseAsString.withOptions({ history: "push" }));

  return {
    orderId,
    openOrder: (id: string) => void setOrderId(id),
    closeOrder: () => void setOrderId(null),
  };
};
