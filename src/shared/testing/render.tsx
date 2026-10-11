import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";

import { MESSAGE_NAMESPACES } from "@/i18n/locales";
import { TIME_ZONE } from "@/shared/lib/format";
import { TipProvider } from "@/shared/ui/tip";

type Messages = Record<string, unknown>;

const loadUzMessages = async (): Promise<Messages> => {
  const entries = await Promise.all(
    MESSAGE_NAMESPACES.map(async (namespace) => {
      const loaded = (await import(`../../../messages/uz/${namespace}.json`)) as { default: Messages };
      return [namespace, loaded.default] as const;
    }),
  );
  return Object.fromEntries(entries);
};

type RenderOptions = {
  /** Boshlang'ich URL query (`?period=7d`). */
  searchParams?: string;
};

/** Komponentni ilovadagi kabi provayderlar ichida chizadi (tarjima uz, so'rovlar qayta urinilmaydi). */
export const renderWithProviders = async (
  ui: ReactNode,
  { searchParams = "" }: RenderOptions = {},
): Promise<RenderResult> => {
  const messages = await loadUzMessages();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <NextIntlClientProvider
      locale="uz"
      timeZone={TIME_ZONE}
      messages={messages}
      // Yo'q tarjima kaliti ilovada jimgina "fazo.kalit" bo'lib ko'rinadi — testda bu xato.
      onError={(error) => {
        throw error;
      }}
    >
      <QueryClientProvider client={queryClient}>
        {/* hasMemory: filtr o'zgarishi testda ham URL holatiga yoziladi */}
        <NuqsTestingAdapter searchParams={searchParams} hasMemory>
          <TipProvider>{ui}</TipProvider>
        </NuqsTestingAdapter>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
};
