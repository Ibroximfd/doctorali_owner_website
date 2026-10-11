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
          !(isAppError(error) && NON_RETRYABLE.has(error.kind)) && failureCount < 2,
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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          <TipProvider>{children}</TipProvider>
        </NuqsAdapter>
        <Toaster position="bottom-right" toastOptions={{ className: "font-sans" }} />
      </QueryClientProvider>
    </ThemeProvider>
  );
};
