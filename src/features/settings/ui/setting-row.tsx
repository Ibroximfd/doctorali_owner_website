import type { ReactNode } from "react";

type SettingRowProps = {
  title: ReactNode;
  description?: ReactNode;
  /** O'ng tomondagi boshqaruv yoki holat belgisi. */
  children: ReactNode;
};

/** Sozlama qatori: chapda nom va izoh, o'ngda boshqaruv. Qatorlar orasidagi chiziqni ota (`divide-y`) beradi. */
export const SettingRow = ({ title, description, children }: SettingRowProps) => (
  <div className="flex items-center gap-3 py-2.5">
    <div className="min-w-0 flex-1 leading-tight">
      <div className="truncate text-sm font-semibold">{title}</div>
      {description ? <div className="text-ink-3 mt-0.5 text-xs">{description}</div> : null}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);
