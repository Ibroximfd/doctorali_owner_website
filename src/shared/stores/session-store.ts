"use client";

import { create } from "zustand";

type SessionState = {
  /**
   * Foydalanuvchi biznes amalini bajara oladimi (xabar yuborish, AI ga baho, signal «ko'rildi»).
   * Boshliq — ha; ruxsat bilan kirgan ko'ruvchi — yo'q (faqat ko'rish). Himoya baribir backendda.
   */
  canAct: boolean;
  setCanAct: (canAct: boolean) => void;
};

/** Sessiya huquqlari: `app` qatlami (`PanelShell`) `me` dan to'ldiradi, featurelar faqat o'qiydi. */
export const useSessionStore = create<SessionState>()((set) => ({
  canAct: true,
  setCanAct: (canAct) => set({ canAct }),
}));

export const useCanAct = () => useSessionStore((state) => state.canAct);
