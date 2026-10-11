"use client";

import { Dialog } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
};

/** Telefon uchun pastdan chiqadigan varaq (filtrlar, qo'shimcha bo'limlar). */
export const Sheet = ({ open, onOpenChange, title, children, className }: SheetProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="bg-scrim data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in fixed inset-0 z-50" />
      <Dialog.Content
        aria-describedby={undefined}
        className={cn(
          "bg-surface shadow-pop fixed inset-x-0 bottom-0 z-50 max-h-[86dvh] overflow-y-auto rounded-t-2xl px-4 pt-2 pb-[calc(1.125rem+env(safe-area-inset-bottom))]",
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-8 data-[state=closed]:fade-out",
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-8 data-[state=open]:fade-in",
          className,
        )}
      >
        <div aria-hidden className="bg-border-strong mx-auto mt-1 mb-3 h-1 w-9 rounded-full" />
        <Dialog.Title className="sr-only">{title}</Dialog.Title>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
