import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pegasus-medium">
          Pegasus Manager
        </p>
        <h1 className="mt-2 text-2xl font-bold text-pegasus-navy sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-sm break-words text-sm leading-6 text-slate-600 lg:max-w-2xl">
          {description}
        </p>
      </div>
      {action ? <div className="w-full sm:w-auto">{action}</div> : null}
    </div>
  );
}
