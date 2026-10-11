"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { linkTelegram, loadTelegramStatus, signInWithPin } from "../api/telegram.api";

export const telegramKeys = { status: ["telegram", "status"] as const };

/**
 * Holat faqat so'ralganda yangilanadi: avtomatik qayta so'rov (fokus, eskirish)
 * bog'lash jarayonidagi yangi sessiyani yopib qo'yardi.
 */
export const useTelegramStatusQuery = (initData: string) =>
  useQuery({
    queryKey: telegramKeys.status,
    queryFn: () => loadTelegramStatus(initData),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

// PIN xatosi qayta yuborilmaydi — har urinish qulfga yaqinlashtiradi.
export const usePinSignIn = () => useMutation({ mutationFn: signInWithPin, retry: false });

export const useLinkTelegram = () => useMutation({ mutationFn: linkTelegram, retry: false });
