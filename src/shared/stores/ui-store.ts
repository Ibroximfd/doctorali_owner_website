"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  /** Desktopda yon panel ikon-relsga yig'ilgan. */
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
};

/** Faqat qobiq holati. Server ma'lumoti bu yerga ko'chirilmaydi — u so'rov keshida. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    }),
    // Server HTML har doim sukut holatda chiziladi; saqlangan holat brauzerda,
    // gidratsiyadan keyin o'qiladi (`AppShell` da) — aks holda HTML mos kelmaydi.
    { name: "da-owner-ui", skipHydration: true },
  ),
);
