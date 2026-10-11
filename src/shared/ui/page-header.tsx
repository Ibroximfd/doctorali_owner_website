import type { ReactNode } from "react";

type PageHeaderProps = { title: string; description?: ReactNode; actions?: ReactNode };

/** Har sahifada bitta `h1`. */
export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <div className="mb-4 flex flex-wrap items-end gap-3">
    <div className="min-w-0">
      <h1 className="font-strong text-xl leading-tight tracking-tight md:text-2xl">{title}</h1>
      {description ? <p className="text-ink-3 mt-1 text-sm">{description}</p> : null}
    </div>
    {actions ? <div className="flex w-full flex-wrap gap-2 md:ml-auto md:w-auto">{actions}</div> : null}
  </div>
);
