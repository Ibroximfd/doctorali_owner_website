"use client";

import { parseAsInteger, useQueryState } from "nuqs";

/**
 * Kuryer kartasi URL parametri (`?courier=<id>`) orqali ochiladi: havola
 * ulashiladi, "orqaga" tugmasi yopadi.
 */
export const useCourierDrawer = () => {
  const [courierId, setCourierId] = useQueryState("courier", parseAsInteger.withOptions({ history: "push" }));

  return {
    courierId,
    openCourier: (id: number) => void setCourierId(id),
    closeCourier: () => void setCourierId(null),
  };
};
