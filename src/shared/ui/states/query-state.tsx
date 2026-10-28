"use client";

import type { ReactNode } from "react";

import { isMissingEndpoint, toAppError } from "@/shared/lib/app-error";
import { cn } from "@/shared/lib/cn";

import { EmptyState, ErrorState, ForbiddenState, SourcePendingState, StaleNote } from "./states";

/** TanStack Query natijasining bu komponentga kerakli qismi. */
type QueryLike<Data> = {
  data: Data | undefined;
  error: unknown;
  isPending: boolean;
  isPlaceholderData: boolean;
  refetch: () => unknown;
};

type QueryStateProps<Data> = {
  query: QueryLike<Data>;
  /** Birinchi yuklanishda — haqiqiy kontent shaklidagi skeleton. */
  skeleton: ReactNode;
  /** Ma'lumot keldi, lekin ko'rsatadigan narsa yo'q. */
  isEmpty?: (data: Data) => boolean;
  empty?: ReactNode;
  children: (data: Data) => ReactNode;
  className?: string;
};

/**
 * Holatlar galereyasi bitta joyda: skeleton · bo'sh · xato+qayta urinish ·
 * ruxsat yo'q · tayyor. Filtr o'zgarganda (placeholder ma'lumot) kontent
 * xiralashib turadi — skeleton qayta chiqmaydi, joylashuv sakramaydi.
 * Oflayn tasmasi qobiqda (global), natija-yo'q esa filtrli ro'yxatlarda.
 */
export const QueryState = <Data,>({
  query,
  skeleton,
  isEmpty,
  empty,
  children,
  className,
}: QueryStateProps<Data>) => {
  const { data, error, isPending, isPlaceholderData, refetch } = query;

  if (data === undefined) {
    if (isPending) return <>{skeleton}</>;
    const appError = toAppError(error);
    if (appError.kind === "forbidden") return <ForbiddenState />;
    if (isMissingEndpoint(appError)) return <SourcePendingState />;
    return <ErrorState error={appError} onRetry={() => void refetch()} />;
  }

  if (isEmpty?.(data)) return <>{empty ?? <EmptyState />}</>;

  return (
    <div
      aria-busy={isPlaceholderData}
      className={cn("transition-opacity", isPlaceholderData && "opacity-60", className)}
    >
      {/* yangilash muvaffaqiyatsiz, lekin oldingi natija bor — uni ko'rsatib, eskirganini aytamiz */}
      {error ? <StaleNote /> : null}
      {children(data)}
    </div>
  );
};
