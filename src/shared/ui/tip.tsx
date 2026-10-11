"use client";

import { Tooltip } from "radix-ui";
import type { ReactNode } from "react";

type TipProps = { content: ReactNode; children: ReactNode };

/**
 * Hover/fokus yordamchi matni. Qiymatni ko'rishning yagona yo'li bo'lmasligi
 * kerak — bola elementda `aria-label` ham bo'lsin.
 */
export const Tip = ({ content, children }: TipProps) => (
  <Tooltip.Root>
    <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content
        sideOffset={6}
        className="bg-surface shadow-pop data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in z-50 max-w-64 rounded-md border px-2.5 py-2 text-xs"
      >
        {content}
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
);

export const TipProvider = ({ children }: { children: ReactNode }) => (
  <Tooltip.Provider delayDuration={120} skipDelayDuration={300}>
    {children}
  </Tooltip.Provider>
);
