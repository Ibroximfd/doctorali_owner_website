"use client";

import { useTranslations } from "next-intl";
import { Dialog } from "radix-ui";

import { Button } from "@/shared/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Nima bo'lishini aytadi — tugmani bosishdan oldin oqibat tushunarli bo'lsin. */
  description: string;
  /** Tugmada amalning o'zi yoziladi ("Chiqarish"), "OK" emas. */
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  /** Amal bajarilmadi — sabab shu yerda, qayta urinish tugmasi yonida ko'rinadi. */
  error?: string;
  onConfirm: () => void;
};

/** Qaytarib bo'lmaydigan amal uchun tasdiqlash oynasi. Fokus tuzog'i, Escape va aria bog'lanishi — Radix'da. */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  isPending,
  error,
  onConfirm,
}: ConfirmDialogProps) => {
  const t = useTranslations("common");

  return (
    // So'rov ketayotganda oyna yopilmaydi — natija (yoki xato) shu yerda ko'rinishi kerak.
    <Dialog.Root open={open} onOpenChange={(next) => (isPending ? undefined : onOpenChange(next))}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-scrim data-[state=open]:animate-in data-[state=open]:fade-in fixed inset-0 z-50" />
        <Dialog.Content className="bg-surface shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in fixed inset-x-4 top-1/2 z-50 mx-auto flex max-w-md -translate-y-1/2 flex-col gap-4 rounded-xl border p-5">
          <div>
            <Dialog.Title className="font-strong text-lg leading-tight">{title}</Dialog.Title>
            <Dialog.Description className="text-ink-2 mt-1.5 text-sm">{description}</Dialog.Description>
          </div>
          {error ? (
            <p role="alert" className="text-crit text-xs">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Dialog.Close asChild>
              <Button disabled={isPending}>{t("cancel")}</Button>
            </Dialog.Close>
            {/* Xavfli amal rangi: umumiy `Button` da bunday `intent` yo'q, shuning uchun token bilan shu yerda. */}
            <Button intent="danger" disabled={isPending} aria-busy={isPending} onClick={onConfirm}>
              {isPending ? pendingLabel : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
