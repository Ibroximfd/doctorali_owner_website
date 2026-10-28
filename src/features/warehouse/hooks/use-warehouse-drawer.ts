"use client";

import { parseAsInteger, useQueryState } from "nuqs";

/** Ombor kartasi URL parametri (`?warehouse=<id>`) orqali ochiladi: havola ulashiladi, "orqaga" yopadi. */
export const useWarehouseDrawer = () => {
  const [warehouseId, setWarehouseId] = useQueryState(
    "warehouse",
    parseAsInteger.withOptions({ history: "push" }),
  );

  return {
    warehouseId,
    openWarehouse: (id: number) => void setWarehouseId(id),
    closeWarehouse: () => void setWarehouseId(null),
  };
};
