"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

/** Ekrandagi so'rovlar ichida eng oxirgi muvaffaqiyatli yangilanish vaqti (ms) yoki `null`. */
export const useLastUpdated = (): number | null => {
  const cache = useQueryClient().getQueryCache();

  const latest = () => {
    const times = cache
      .getAll()
      .filter((query) => query.getObserversCount() > 0)
      .map((query) => query.state.dataUpdatedAt);
    const max = Math.max(0, ...times);
    return max > 0 ? max : null;
  };

  return useSyncExternalStore(
    (onChange) => cache.subscribe(onChange),
    latest,
    () => null,
  );
};
