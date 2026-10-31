"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { routes } from "@/shared/config/routes";

import { loadMe, logout, requestChallenge, verifyCode } from "../api/auth.api";

export const authKeys = { me: ["auth", "me"] as const };

const TEN_MINUTES_MS = 10 * 60_000;

// Foydalanuvchi o'zi qayta urinadi — avtomatik takror parolni bloklashga olib keladi.
export const useRequestChallenge = () => useMutation({ mutationFn: requestChallenge, retry: false });

export const useVerifyCode = () => useMutation({ mutationFn: verifyCode, retry: false });

export const useMeQuery = () =>
  useQuery({ queryKey: authKeys.me, queryFn: loadMe, staleTime: TEN_MINUTES_MS });

/** Chiqish: keshdagi hamma ma'lumot tozalanadi, so'ng to'liq o'tish — kirish sahifasiga. */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    retry: false,
    onSettled: () => {
      queryClient.clear();
      window.location.assign(routes.login);
    },
  });
};
