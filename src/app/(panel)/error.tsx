"use client";

import { useEffect } from "react";

import { toAppError } from "@/shared/lib/app-error";
import { Card } from "@/shared/ui/card";
import { ErrorState } from "@/shared/ui/states";

type PanelErrorProps = { error: Error & { digest?: string }; reset: () => void };

/** Kutilmagan render xatosi uchun oxirgi chora. Kutilgan holatlar (bo'sh, oflayn, xato) bloklarning o'zida. */
export default function PanelError({ error, reset }: PanelErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <ErrorState error={toAppError(error)} onRetry={reset} />
    </Card>
  );
}
