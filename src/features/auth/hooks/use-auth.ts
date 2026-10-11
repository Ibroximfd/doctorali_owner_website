"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { routes } from "@/shared/config/routes";
import { isTelegramChannel, telegramEntryHref } from "@/shared/lib/channel";

import { loadMe, logout, requestChallenge, verifyCode } from "../api/auth.api";

export const authKeys = { me: ["auth", "me"] as const };

const TEN_MINUTES_MS = 10 * 60_000;

// Foydalanuvchi o'zi qayta urinadi — avtomatik takror parolni bloklashga olib keladi.
export const useRequestChallenge = () => useMutation({ mutationFn: requestChallenge, retry: false });

export const useVerifyCode = () => useMutation({ mutationFn: verifyCode, retry: false });

export const useMeQuery = () =>
  useQuery({ queryKey: authKeys.me, queryFn: loadMe, staleTime: TEN_MINUTES_MS });

/**
 * Chiqish (yoki Telegramda qulflash): keshdagi hamma ma'lumot tozalanadi, so'ng
 * to'liq o'tish — saytda kirish sahifasiga, Telegramda shu sahifaga qaytadigan PIN ekraniga.
 * Manzil chiqishdan oldin aniqlanadi: server kanal belgisini ham o'chiradi.
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    retry: false,
    onMutate: () =>
      isTelegramChannel()
        ? telegramEntryHref(`${window.location.pathname}${window.location.search}`)
        : routes.login,
    onSettled: (_data, _error, _variables, destination) => {
      queryClient.clear();
      window.location.assign(destination ?? routes.login);
    },
  });
};
