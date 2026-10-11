"use client";

import { parseAsInteger, useQueryState } from "nuqs";

/**
 * Operator kartasi URL parametri (`?operator=<id>`) orqali ochiladi: havola
 * ulashiladi, "orqaga" tugmasi yopadi (buyurtma kartasidagi kabi).
 */
export const useOperatorDrawer = () => {
  const [operatorId, setOperatorId] = useQueryState(
    "operator",
    parseAsInteger.withOptions({ history: "push" }),
  );

  return {
    operatorId,
    openOperator: (id: number) => void setOperatorId(id),
    closeOperator: () => void setOperatorId(null),
  };
};
