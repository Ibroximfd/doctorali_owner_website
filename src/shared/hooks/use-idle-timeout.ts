"use client";

import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "wheel"] as const;
/** Oxirgi harakat vaqti barcha tablar uchun umumiy: faol tab boshqa tabni chiqarib yubormaydi. */
const STORAGE_KEY = "da_owner_last_activity";
const CHECK_EVERY_MS = 15_000;
/** Har harakatda yozish shart emas — shu oraliqda bir marta yetarli. */
const WRITE_THROTTLE_MS = 5_000;

const readShared = (): number | null => {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const writeShared = (time: number): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(time));
  } catch {
    // Saqlash yopiq (maxfiy rejim) — shu tabning o'z hisobi yetarli.
  }
};

/**
 * Foydalanuvchi `timeoutMs` davomida hech narsa qilmasa `onIdle` ni chaqiradi.
 * Hisob soatga qarab yuritiladi, taymerga emas: telefonda tab yoki PWA fonda
 * muzlatilsa ham, qaytib ochilganda o'tgan vaqt hisobga olinadi. Sahifaga
 * qaytishning o'zi harakat sanalmaydi.
 */
export const useIdleTimeout = (onIdle: () => void, timeoutMs: number): void => {
  const onIdleRef = useRef(onIdle);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    let lastActivity = Date.now();
    let hasFired = false;
    writeShared(lastActivity);

    const markActive = () => {
      const now = Date.now();
      if (now - lastActivity < WRITE_THROTTLE_MS) return;
      lastActivity = now;
      writeShared(now);
    };

    const check = () => {
      if (hasFired) return;
      const latest = Math.max(lastActivity, readShared() ?? 0);
      if (Date.now() - latest < timeoutMs) return;
      hasFired = true;
      onIdleRef.current();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };

    const timer = window.setInterval(check, Math.min(CHECK_EVERY_MS, timeoutMs));
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, markActive, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, markActive);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [timeoutMs]);
};
