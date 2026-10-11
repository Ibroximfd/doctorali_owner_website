"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sarlavha majburiy — u dialogning nomi (ekran o'quvchi uchun). */
  title: ReactNode;
  /** Sarlavha ostidagi qator (holat belgilari, izoh). */
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** O'ngdan chiqadigan tafsilot paneli; telefonda to'liq ekran. Fokus tuzog'i va Escape — Radix'da. */
export const Drawer = ({ open, onOpenChange, title, subtitle, children, className }: DrawerProps) => {
  const t = useTranslations("common");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-scrim data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in fixed inset-0 z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "bg-surface shadow-pop fixed inset-y-0 right-0 z-50 flex w-full flex-col md:w-130 md:border-l",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:slide-out-to-right-6",
            "data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-right-6",
            className,
          )}
        >
          <div className="flex items-start gap-2.5 border-b px-4.5 py-3.5">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-strong text-lg leading-tight">{title}</Dialog.Title>
              {subtitle ? <div className="mt-1 flex flex-wrap items-center gap-2">{subtitle}</div> : null}
            </div>
            <Dialog.Close
              aria-label={t("close")}
              className="text-ink-2 hover:bg-surface-3 hover:text-ink grid size-8.5 shrink-0 place-items-center rounded-md"
            >
              <X aria-hidden className="size-4.5" />
            </Dialog.Close>
          </div>
          <div className="flex flex-1 flex-col gap-4.5 overflow-y-auto px-4.5 pt-4 pb-7">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

/** Drawer ichidagi bo'lim sarlavhasi. */
export const DrawerSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section>
    <h3 className="text-2xs text-ink-3 mb-2 font-semibold tracking-widest uppercase">{title}</h3>
    {children}
  </section>
);
