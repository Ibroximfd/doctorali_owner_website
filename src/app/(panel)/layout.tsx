import { Suspense, type ReactNode } from "react";

import { PanelShell } from "./panel-shell";

/** Panel sahifalari uchun umumiy qobiq. Filtr URL dan o'qiladi — shuning uchun `Suspense`. */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <PanelShell>{children}</PanelShell>
    </Suspense>
  );
}
