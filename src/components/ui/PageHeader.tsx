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
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-pegasus-sky">
          Pegasus Manager
        </p>
        <h1 className="mt-1.5 text-2xl font-black text-pegasus-navy sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-sm break-words text-sm leading-6 text-slate-500 lg:max-w-2xl">
          {description}
        </p>
      </div>
      {action ? <div className="w-full sm:w-auto">{action}</div> : null}
    </div>
  );
}
