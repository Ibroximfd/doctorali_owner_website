"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import { TELEGRAM_ENTRY, routes } from "@/shared/config/routes";
import { isAppError } from "@/shared/lib/app-error";
import { signInHref } from "@/shared/lib/channel";
import { TipProvider } from "@/shared/ui/tip";

/** Qayta urinish foyda bermaydigan xatolar: ruxsat, shartnoma, noto'g'ri so'rov. */
const NON_RETRYABLE = new Set(["unauthorized", "forbidden", "not-found", "validation", "contract"]);

/**
 * Ma'lumot shu muddat «yangi» hisoblanadi: bo'limlar orasida o'tganda keshdagi natija
 * darhol chiziladi va qayta so'ralmaydi. Jonli bloklar o'z `refetchInterval` i bilan yangilanadi.
 */
const STALE_MS = 30_000;
/** Ko'rinmay qolgan bo'lim keshi shuncha saqlanadi — qaytib kelganda skeleton chiqmaydi. */
const GC_MS = 10 * 60_000;
/** Osilgan backendda kutish: bitta qayta urinish, 1 s dan keyin (eski: 2 urinish × 20 s). */
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1000;

/** Sessiya tugagan bo'lsa — kirish sahifasiga (Telegramda — PIN ga), qaytib kelish manzili bilan. */
const redirectToLogin = () => {
  const { pathname, search } = window.location;
  if (pathname === routes.login || pathname === TELEGRAM_ENTRY) return;
  // To'liq o'tish ataylab: xotiradagi moliyaviy ma'lumot (so'rov keshi) butunlay tashlanadi.
  window.location.assign(signInHref(`${pathname}${search}`));
};

const redirectIfSignedOut = (error: unknown) => {
  if (isAppError(error) && error.kind === "unauthorized") redirectToLogin();
};

const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({ onError: redirectIfSignedOut }),
    // Yozuvchi amal (signal «ko'rildi», reja saqlash) ham sessiya tugaganini bildiradi.
    // Kirish va PIN formalari o'z xatosini o'zi ko'rsatadi — ular sahifada qoladi.
    mutationCache: new MutationCache({ onError: redirectIfSignedOut }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          !(isAppError(error) && NON_RETRYABLE.has(error.kind)) && failureCount < MAX_RETRIES,
        retryDelay: RETRY_DELAY_MS,
        staleTime: STALE_MS,
        gcTime: GC_MS,
        refetchOnWindowFocus: true,
        // Tab yashirin bo'lsa davriy yangilanish to'xtaydi.
        refetchIntervalInBackground: false,
      },
      mutations: { retry: false },
    },
  });

/** Ilova bo'ylab provayderlar. `QueryClient` har brauzer sessiyasiga bitta. */
export const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          <TipProvider>{children}</TipProvider>
        </NuqsAdapter>
        <Toaster position="bottom-right" toastOptions={{ className: "font-sans" }} />
      </QueryClientProvider>
    </ThemeProvider>
  );
};
