import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { ScopeLink } from "./scope-link";

/** Karta sarlavhasidagi boshqa bo'limga havola (tanlangan davr va filial saqlanadi). */
export const CardLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <ScopeLink
    href={href}
    className="text-accent inline-flex items-center gap-0.5 text-xs font-semibold hover:underline"
  >
    {children}
    <ChevronRight aria-hidden className="size-3.5" />
  </ScopeLink>
);
